ALTER TABLE public.members ADD COLUMN member_id INTEGER UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_members_member_id ON public.members(member_id);