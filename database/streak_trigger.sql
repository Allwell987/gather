-- Function to update user streak automatically when a devotional is read
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
    today DATE;
BEGIN
    -- Get the user's current streak info from profiles
    SELECT streak_last_date, streak_count
    INTO last_date, current_streak
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Use the date the devotional was read (in UTC)
    today := (NEW.read_at AT TIME ZONE 'UTC')::date;

    IF last_date IS NULL THEN
        -- First time reading, start streak at 1
        UPDATE public.profiles
        SET streak_count = 1, streak_last_date = today
        WHERE id = NEW.user_id;
    ELSIF today > last_date THEN
        IF today = last_date + INTERVAL '1 day' THEN
            -- Read yesterday, increment streak
            UPDATE public.profiles
            SET streak_count = current_streak + 1, streak_last_date = today
            WHERE id = NEW.user_id;
        ELSE
            -- Streak broken (last read was before yesterday), reset to 1
            UPDATE public.profiles
            SET streak_count = 1, streak_last_date = today
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure the trigger is attached to devotional_reads
DROP TRIGGER IF EXISTS on_devotional_read_update_streak ON public.devotional_reads;
CREATE TRIGGER on_devotional_read_update_streak
AFTER INSERT OR UPDATE ON public.devotional_reads
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();
