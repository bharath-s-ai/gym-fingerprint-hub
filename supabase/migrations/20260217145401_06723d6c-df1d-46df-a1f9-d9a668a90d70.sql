
-- Allow public delete on attendance (needed for member deletion cleanup)
CREATE POLICY "Allow public delete attendance"
ON public.attendance
FOR DELETE
USING (true);

-- Allow public delete on members
CREATE POLICY "Allow public delete members"
ON public.members
FOR DELETE
USING (true);
