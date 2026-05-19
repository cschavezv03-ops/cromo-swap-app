-- ============================================================================
-- 0082_grant_marketplace_match_rpcs
--
-- BUG CRÍTICO: 8 RPCs del core de la app tienen REVOKE ALL FROM authenticated
-- desde migrations antiguas (0024, 0029, 0031, 0033). El cliente recibía
-- "permission denied for function ..." y mostraba toast genérico "no se pudo
-- crear publicación", "error al proponer match", etc.
--
-- Restauramos EXECUTE solo para authenticated (las funciones SECURITY DEFINER
-- validan internamente auth.uid()). NO se da a anon ni a public.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.fn_create_sale_listing(uuid, numeric, boolean, boolean, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_package_listing(jsonb, numeric, boolean, boolean, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_purchase_request(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_propose_match(uuid, uuid, text, integer, integer, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_respond_match(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_accept_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_transaction(uuid, text) TO authenticated;
