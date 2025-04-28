# date_util.py

from datetime import datetime, timedelta
from typing import Optional
from convertdate import persian, islamic


# Helper: Convert Western digits in a string to Farsi numerals
def to_farsi_numerals(text: str) -> str:
    western_to_farsi = {
        "0": "۰",
        "1": "۱",
        "2": "۲",
        "3": "۳",
        "4": "۴",
        "5": "۵",
        "6": "۶",
        "7": "۷",
        "8": "۸",
        "9": "۹",
    }
    return "".join(western_to_farsi.get(ch, ch) for ch in text)


# Mapping for Farsi names of Gregorian months
farsi_gregorian_months = {
    1: "ژانویه",
    2: "فوریه",
    3: "مارس",
    4: "آوریل",
    5: "مه",
    6: "ژوئن",
    7: "ژوئیه",
    8: "اوت",
    9: "سپتامبر",
    10: "اکتبر",
    11: "نوامبر",
    12: "دسامبر",
}

# English names for Persian (Shamsi) months
english_persian_months = [
    "Farvardin",
    "Ordibehesht",
    "Khordad",
    "Tir",
    "Mordad",
    "Shahrivar",
    "Mehr",
    "Aban",
    "Azar",
    "Dey",
    "Bahman",
    "Esfand",
]

# Farsi names for Persian (Shamsi) months
farsi_shamsi_months = {
    1: "فروردین",
    2: "اردیبهشت",
    3: "خرداد",
    4: "تیر",
    5: "مرداد",
    6: "شهریور",
    7: "مهر",
    8: "آبان",
    9: "آذر",
    10: "دی",
    11: "بهمن",
    12: "اسفند",
}

# Islamic month names in Farsi and English
farsi_islamic_months = [
    "محرم",
    "صفر",
    "ربیع‌الاول",
    "ربیع‌الثانی",
    "جمادی‌الاول",
    "جمادی‌الثانی",
    "رجب",
    "شعبان",
    "رمضان",
    "شوال",
    "ذیقعده",
    "ذیحجه",
]
english_islamic_months = [
    "Muharram",
    "Safar",
    "Rabi' al-awwal",
    "Rabi' al-thani",
    "Jumada al-awwal",
    "Jumada al-thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qidah",
    "Dhu al-Hijjah",
]

# Weekday mappings for Farsi (full and abbreviated)
english_to_farsi_weekdays = {
    "Monday": "دوشنبه",
    "Tuesday": "سه‌شنبه",
    "Wednesday": "چهارشنبه",
    "Thursday": "پنجشنبه",
    "Friday": "جمعه",
    "Saturday": "شنبه",
    "Sunday": "یکشنبه",
}

english_to_farsi_weekdays_abbrev = {
    "Mon": "دوشن",
    "Tue": "سه‌شن",
    "Wed": "چهارش",
    "Thu": "پنجش",
    "Fri": "جمعه",
    "Sat": "شنب",
    "Sun": "یکش",
}


def georgian(
    year: bool,
    month: bool,
    day: bool,
    language: str = "english",
    date: Optional[datetime] = None,
    days_into_future: int = 0,
    separator: str = " ",
    **kwargs,
) -> str:
    """
    Returns a formatted Gregorian date string, offset by a number of days into the future.
    If language is "farsi", numeric parts are converted to Farsi digits.
    """
    if date is None:
        date = datetime.now()
    date += timedelta(days=days_into_future)

    components = []
    if day:
        day_str = str(date.day)
        if language.lower() == "farsi":
            day_str = to_farsi_numerals(day_str)
        components.append(day_str)
    if month:
        if language.lower() == "english":
            components.append(date.strftime("%B"))
        elif language.lower() == "farsi":
            month_name = farsi_gregorian_months.get(date.month, date.strftime("%B"))
            components.append(month_name)
        else:
            components.append(date.strftime("%B"))
    if year:
        year_str = str(date.year)
        if language.lower() == "farsi":
            year_str = to_farsi_numerals(year_str)
        components.append(year_str)
    return separator.join(components)


def arabic(
    year: bool,
    month: bool,
    day: bool,
    language: str = "farsi",
    date: Optional[datetime] = None,
    days_into_future: int = 0,
    separator: str = " ",
    month_format: str = "name",
    **kwargs,
) -> str:
    """
    Returns a formatted Islamic (Arabic) date string, offset by a specified number of days.
    The month_format parameter allows numeric ("number") or textual ("name") month output.
    Numeric parts are converted to Farsi digits when language is "farsi".
    """
    if date is None:
        date = datetime.now()
    date += timedelta(days=days_into_future)

    i_year, i_month, i_day = islamic.from_gregorian(date.year, date.month, date.day)
    components = []
    if day:
        day_str = str(i_day)
        if language.lower() == "farsi":
            day_str = to_farsi_numerals(day_str)
        components.append(day_str)
    if month:
        if month_format.lower() == "name":
            if language.lower() == "farsi":
                try:
                    month_name = farsi_islamic_months[i_month - 1]
                except IndexError:
                    month_name = str(i_month)
            else:
                try:
                    month_name = english_islamic_months[i_month - 1]
                except IndexError:
                    month_name = str(i_month)
            components.append(month_name)
        else:
            m_str = str(i_month)
            if language.lower() == "farsi":
                m_str = to_farsi_numerals(m_str)
            components.append(m_str)
    if year:
        year_str = str(i_year)
        if language.lower() == "farsi":
            year_str = to_farsi_numerals(year_str)
        components.append(year_str)
    return separator.join(components)


def shamsi(
    year: bool,
    month: bool,
    day: bool,
    language: str = "farsi",
    date: Optional[datetime] = None,
    days_into_future: int = 0,
    separator: str = " ",
    **kwargs,
) -> str:
    """
    Returns a formatted Persian (Shamsi) date string, offset by a number of days into the future.
    Numeric parts are converted to Farsi digits when language is "farsi".
    """
    if date is None:
        date = datetime.now()
    date += timedelta(days=days_into_future)

    p_year, p_month, p_day = persian.from_gregorian(date.year, date.month, date.day)
    components = []
    if day:
        day_str = str(p_day)
        if language.lower() == "farsi":
            day_str = to_farsi_numerals(day_str)
        components.append(day_str)
    if month:
        if language.lower() == "farsi":
            month_name = farsi_shamsi_months.get(p_month, str(p_month))
            components.append(month_name)
        elif language.lower() == "english":
            try:
                month_name = english_persian_months[p_month - 1]
            except IndexError:
                month_name = str(p_month)
            components.append(month_name)
        else:
            components.append(str(p_month))
    if year:
        year_str = str(p_year)
        if language.lower() == "farsi":
            year_str = to_farsi_numerals(year_str)
        components.append(year_str)
    return separator.join(components)


def day_of_week(
    date: Optional[datetime] = None,
    language: str = "farsi",
    days_into_future: int = 0,
    short: bool = False,
    **kwargs,
) -> str:
    """
    Returns the name of the day of the week for a date offset by a given number of days.
    For "farsi", it returns the appropriate mapping.
    """
    if date is None:
        date = datetime.now()
    date += timedelta(days=days_into_future)

    if language.lower() == "english":
        return date.strftime("%a") if short else date.strftime("%A")
    elif language.lower() == "farsi":
        if short:
            eng_abbrev = date.strftime("%a")
            return english_to_farsi_weekdays_abbrev.get(eng_abbrev, eng_abbrev)
        else:
            eng_full = date.strftime("%A")
            return english_to_farsi_weekdays.get(eng_full, eng_full)
    else:
        return date.strftime("%A")


def clock_time(
    show_hours: bool = True,
    show_minutes: bool = True,
    show_seconds: bool = False,
    language: str = "farsi",
    date: Optional[datetime] = None,
    hours_into_future: int = 0,
    minutes_into_future: int = 0,
    seconds_into_future: int = 0,
    separator: str = ":",
    **kwargs,
) -> str:
    """
    Returns a formatted clock time string with options to include hours, minutes, and seconds.
    It also supports an optional time offset.

    If language is "farsi", the resulting digits are converted to Farsi numerals.
    """
    if date is None:
        date = datetime.now()
    # Apply the time offset
    date += timedelta(
        hours=hours_into_future,
        minutes=minutes_into_future,
        seconds=seconds_into_future,
    )

    components = []
    if show_hours:
        components.append(f"{date.hour:02d}")
    if show_minutes:
        components.append(f"{date.minute:02d}")
    if show_seconds:
        components.append(f"{date.second:02d}")

    time_str = separator.join(components)
    if language.lower() == "farsi":
        time_str = to_farsi_numerals(time_str)
    return time_str


# Example usage (for testing purposes)
if __name__ == "__main__":
    now = datetime.now()
    print(
        "Gregorian (English):",
        georgian(
            year=True,
            month=True,
            day=True,
            language="english",
            date=now,
            days_into_future=2,
        ),
    )
    print(
        "Gregorian (Farsi):",
        georgian(
            year=True,
            month=True,
            day=True,
            language="farsi",
            date=now,
            days_into_future=2,
        ),
    )
    print(
        "Islamic (default name):",
        arabic(year=True, month=True, day=True, date=now, days_into_future=2),
    )
    print(
        "Islamic (Farsi, numeric):",
        arabic(
            year=True,
            month=True,
            day=True,
            language="farsi",
            date=now,
            days_into_future=2,
            month_format="number",
        ),
    )
    print(
        "Islamic (Farsi, name):",
        arabic(
            year=True,
            month=True,
            day=True,
            language="farsi",
            date=now,
            days_into_future=2,
            month_format="name",
        ),
    )
    print(
        "Shamsi (Farsi):",
        shamsi(
            year=True,
            month=True,
            day=True,
            language="farsi",
            date=now,
            days_into_future=2,
        ),
    )
    print(
        "Shamsi (English):",
        shamsi(
            year=True,
            month=True,
            day=True,
            language="english",
            date=now,
            days_into_future=2,
        ),
    )
    print(
        "Day of Week (English):",
        day_of_week(date=now, language="english", days_into_future=2),
    )
    print(
        "Day of Week (Farsi, abbreviated):",
        day_of_week(date=now, language="farsi", days_into_future=2, short=True),
    )

    # Testing the clock_time function
    print("Clock Time (English, default):", clock_time())
    print("Clock Time (English, with seconds):", clock_time(show_seconds=True))
    print(
        "Clock Time (Farsi, with seconds):",
        clock_time(show_seconds=True, language="farsi"),
    )
    print(
        "Clock Time (Farsi, future time):",
        clock_time(
            show_seconds=True,
            language="farsi",
            hours_into_future=1,
            minutes_into_future=15,
            seconds_into_future=30,
        ),
    )
