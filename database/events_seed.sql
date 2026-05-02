-- Seed Weekly Events for The Wealth Reality Church
-- Based on SERVICE_TIMES in HomeScreen.tsx

-- Helper to get start of day (using timestamptz to match now())
CREATE OR REPLACE FUNCTION start_of_day(ts timestamptz)
RETURNS timestamptz AS $$
BEGIN
    RETURN date_trunc('day', ts);
END;
$$ LANGUAGE plpgsql;

-- Function to get the date of the next occurrence of a weekday
CREATE OR REPLACE FUNCTION get_next_weekday(day_num integer)
RETURNS timestamptz AS $$
DECLARE
    next_date timestamptz;
BEGIN
    -- This calculates the date of the given weekday (0=Sun, 1=Mon, etc.) in the current week
    next_date := start_of_day(now()) + ((day_num - extract(dow from now())::integer + 7) % 7) * interval '1 day';
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get the upcoming last Friday of month.
-- If this month's last Friday has passed, returns next month's last Friday.
CREATE OR REPLACE FUNCTION get_upcoming_last_friday()
RETURNS timestamptz AS $$
DECLARE
        month_end timestamptz;
        last_friday_this_month timestamptz;
        next_month_end timestamptz;
BEGIN
        month_end := date_trunc('month', now()) + interval '1 month' - interval '1 day';
        last_friday_this_month := date_trunc('day', month_end)
            - ((extract(dow from month_end)::integer - 5 + 7) % 7) * interval '1 day';

        IF last_friday_this_month >= start_of_day(now()) THEN
                RETURN last_friday_this_month;
        END IF;

        next_month_end := date_trunc('month', now()) + interval '2 month' - interval '1 day';
        RETURN date_trunc('day', next_month_end)
            - ((extract(dow from next_month_end)::integer - 5 + 7) % 7) * interval '1 day';
END;
$$ LANGUAGE plpgsql;

-- Delete future events to avoid duplicates when re-running
DELETE FROM events WHERE start_time > NOW();

-- Sunday Morning Worship (9:00 AM)
INSERT INTO events (title, description, category, start_time, end_time, location, capacity)
VALUES (
    'Morning Worship Service',
    'Join us for a powerful time of worship and the Word.',
    'worship',
    get_next_weekday(0) + interval '9 hours',
    get_next_weekday(0) + interval '11 hours 30 minutes',
    'Main Sanctuary',
    500
);

-- Monday Cell Meeting (G5 Meeting) (5:00 PM)
INSERT INTO events (title, description, category, start_time, end_time, location, capacity)
VALUES (
    'G5 Meeting',
    'Small group fellowship and discipleship meeting.',
    'fellowship',
    get_next_weekday(1) + interval '17 hours',
    get_next_weekday(1) + interval '19 hours',
    'Various Locations',
    20
);

-- Wednesday Bible Study (6:30 PM)
INSERT INTO events (title, description, category, start_time, end_time, location, capacity)
VALUES (
    'Mid-week Bible Study',
    'Digging deep into the scriptures for spiritual growth.',
    'bible_study',
    get_next_weekday(3) + interval '18 hours 30 minutes',
    get_next_weekday(3) + interval '20 hours 30 minutes',
    'Grace Hall',
    200
);

-- Friday Prayer Meeting (7:00 PM)
INSERT INTO events (title, description, category, start_time, end_time, location, capacity)
VALUES (
    'Friday Power Night',
    'A dedicated time of intercession and spiritual warfare.',
    'prayer',
    get_upcoming_last_friday() + interval '19 hours',
    get_upcoming_last_friday() + interval '21 hours',
    'Main Sanctuary',
    250
);

-- Cleanup temp functions
DROP FUNCTION get_next_weekday(integer);
DROP FUNCTION get_upcoming_last_friday();
DROP FUNCTION start_of_day(timestamptz);
