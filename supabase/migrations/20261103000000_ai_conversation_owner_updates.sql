-- Permit users to update only their own Robo conversation rows.
-- This is required by the client's upsert calls when a row already exists.
-- Existing SELECT/INSERT/DELETE policies remain in force.

DROP POLICY IF EXISTS "ai_conv_update_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_update_own"
  ON public.ai_conversations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_msg_update_own" ON public.ai_messages;
CREATE POLICY "ai_msg_update_own"
  ON public.ai_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.ai_conversations
      WHERE id = conversation_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ai_conversations
      WHERE id = conversation_id
        AND user_id = auth.uid()
    )
  );
