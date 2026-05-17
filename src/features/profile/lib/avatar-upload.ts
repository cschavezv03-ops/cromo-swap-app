import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const BUCKET = 'profile-avatars';

export type AvatarUploadResult = {
  url: string | null;
  cancelled: boolean;
};

/**
 * Pide permiso, abre el picker, sube la imagen al bucket público y devuelve
 * la URL final. Sobreescribe el avatar previo del user (mismo path).
 *
 * Devuelve `cancelled:true` si el user canceló el picker.
 * Lanza Error si falla permisos, upload o public-url resolution.
 */
export async function pickAndUploadAvatar(
  userId: string,
): Promise<AvatarUploadResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('media_library_permission_denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { url: null, cancelled: true };
  }

  const asset = result.assets[0];
  const mime = asset.mimeType ?? 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  // expo-image-picker da URI local file:// — fetch + blob para Storage
  const resp = await fetch(asset.uri);
  const arrayBuffer = await resp.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mime,
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust con timestamp para que la imagen nueva re-renderice.
  const finalUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: finalUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return { url: finalUrl, cancelled: false };
}
