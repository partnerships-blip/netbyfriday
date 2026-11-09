-- Long email threads: the pasted message kept on an agreement draft can be up to 200,000 characters (was 20,000),
-- the same as a pasted contract.
alter table public.agreements drop constraint if exists agreements_source_text_check;
alter table public.agreements add constraint agreements_source_text_check check (char_length(source_text) <= 200000);
