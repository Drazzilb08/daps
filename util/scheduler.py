import datetime
from util.utility import create_table
import json
import re

# Options:
# run - will run a single time per run of main.py
# hourly - Will perform the action every hour on the hour
# daily(int) - daily(12) - Will perform the action every day at 12:00am
# weekly(day) - weekly(monday) or weekly(monday|tuesday) - Will perform the action on the day(s) of the week specified at 12:00am
# monthly(int) - monthly(12) - Will perform the action on the specified day of every month at 12:00am
# range(month/date-month/date) - range(12/01-12/31) or range(12/01-12/31|01/01-01/31) - Will perform the action on the specified date range every year, every day at 12:00am
# all[options] - all[range(12/01-12/31), weekly(thursday)] or all[range(12/01-12/31), weekly(thursday|friday), hourly] or all[range(12/01-12/31), weekly(thursday), daily(12)] - Uses a combination of above options to perform the action
# all[weekly(thursday), daily(12)] - Will perform the action every Thursday at 12:00am
    # Note: 'options' must be in order range, monthly, weekly, daily, hourly

options = [
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "range",
    "never",
    "all",
    "never"
]

days_of_week = {
    "sunday": 0,
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6
}

def handle_hourly(run_dict):
    """
    Handle the hourly schedule type.
    
    Args:
        run_dict (dict): The dictionary containing the schedule information
        
    Returns:
        run_dict (dict): The updated dictionary containing the schedule information
    """

    action_type = "hourly"
    run_dict = {}
    run_time = 0
    run_time = int(run_time)
    run_dict['type'] = action_type
    run_dict['minutes'] = run_time
    return run_dict

def handle_daily(input, run_dict, logger):
    """
    Handle the daily schedule type.
    
    Args:
        input (str): The input string containing the schedule information
        run_dict (dict): The dictionary containing the schedule information
        logger (logger): The logger to use for logging output

    Returns:
        run_dict (dict): The updated dictionary containing the schedule information
    """
    # Set the action type as 'daily'
    action_type = "daily"
    
    # Extract the run time from the input string
    run_time = int(input.split("(")[1].split(")")[0])
    
    # Check if multiple run times are specified
    if "," in run_time:
        run_time = run_time.split(",")
    else:
        run_time = [run_time]
    
    # Check if the run time is within a valid range (0-23 for hours)
    if run_time not in range(0, 24):
        logger.error(f"Error: {run_time} is not a valid hour.")
        exit()
    
    # Update the run_dict with the action type and run time(s)
    run_dict = {
        'type': action_type, 
        'run_time': run_time
    }
    return run_dict

def handle_weekly(input, run_dict, logger):
    """
    Handle the weekly schedule type.
    
    Args:
        input (str): The input string containing the schedule information
        run_dict (dict): The dictionary containing the schedule information
        logger (logger): The logger to use for logging output
        
    Returns:
        run_dict (dict): The updated dictionary containing the schedule information
    """
    
    # Set the action type as 'weekly'
    action_type = "weekly"
    
    # Clear the existing contents of run_dict
    run_dict = {}
    
    # Assign the action type to the run_dict
    run_dict['type'] = action_type
    
    # Extract the run day from the input string
    run_day = input.split("(")[1].split(")")[0]
    
    # Initialize run_time to 0
    run_time = 0
    
    # Check for multiple days separated by '|'
    if "|" in run_day:
        run_day = run_day.split("|")
        
    # Ensure run_day is a list
    if isinstance(run_day, str):
        run_day = [run_day]
        
    # Check if each day provided is a valid day of the week
    for day in run_day:
        if day not in days_of_week:
            logger.error(f"Error: {day} is not a valid day of the week.")
            exit()
    
    # Map the provided days to their numerical representation (0-6)
    run_dict['run_day'] = [days_of_week[day] for day in run_day]
    
    # Assign the run_time to the run_dict
    run_dict['run_time'] = run_time
    
    return run_dict


def handle_monthly(input, run_dict, logger):
    """
    Handle the monthly schedule type.
    
    Args:
        input (str): The input string containing the schedule information
        run_dict (dict): The dictionary containing the schedule information
        logger (logger): The logger to use for logging output
        
    Returns:
        run_dict (dict): The updated dictionary containing the schedule information
    """
    
    # Set the action type as 'monthly'
    action_type = "monthly"
    
    # Extract the run date from the input string
    run_date = input.split("(")[1].split(")")[0]
    
    # Clear the existing contents of run_dict
    run_dict = {}
    
    # Assign the action type to the run_dict
    run_dict['type'] = action_type
    
    # Initialize run_time to 0
    run_time = 0
    
    # Convert run_date to an integer
    run_date = int(run_date)
    
    # Check if the provided run_date is a valid day of the month
    if run_date not in range(1, 32):
        logger.error(f"Error: {run_date} is not a valid month.")
        exit()
    
    # Update run_dict with action type, run_date, and run_time
    run_dict = {
        'type': action_type,
        'run_date': run_date,
        'run_time': run_time
    }
    
    return run_dict

def handle_all(input, run_dict, logger):
    """
    Handle the all schedule type.
    
    Args:
        input (str): The input string containing the schedule information
        run_dict (dict): The dictionary containing the schedule information
        logger (logger): The logger to use for logging output
        
    Returns:
        run_dict (dict): The updated dictionary containing the schedule information
    """
    
    # Initialize an empty list to hold the schedule items
    run_items = []
    
    # Dictionary of handlers for different schedule types
    handlers = {
        "hourly": handle_hourly,
        "daily": handle_daily,
        "weekly": handle_weekly,
        "monthly": handle_monthly,
    }
    
    # Extract individual schedule items from the input string
    run_items = input.strip("all[]").replace(" ", "").split(",")
    
    # Loop through each item in run_items
    for item in run_items:
        # Check each prefix against the item and use the appropriate handler
        for prefix, handler in handlers.items():
            if item.startswith(prefix):
                # Call the respective handler function for the item
                new_dict = handler(item, run_dict)
                
                # Update run_dict with the new information
                for key, value in new_dict.items():
                    if key == 'type' and key in run_dict:
                        continue
                    run_dict[key] = value
                break
        else:
            # If no valid prefix is found, log an error and exit
            logger.error(f"Error: {item} is not a valid option.")
            exit()
    
    # Return the updated run_dict
    return run_dict

def scheduler(input, logger):
    """
    Schedule a script to run at a specified time.
    
    Args:
        input (str): The input string containing the schedule information
        logger (logger): The logger to use for logging output
        
    Returns:
        bool: True if the script should run, False otherwise
    """
    
    # Convert the input string to lowercase
    input = input.lower()
    
    # Initialize an empty dictionary to store schedule information
    run_dict = {}
    
    # Dictionary of handlers for different schedule types
    handlers = {
        "hourly": handle_hourly,
        "daily": handle_daily,
        "weekly": handle_weekly,
        "monthly": handle_monthly,
        "all": handle_all
    }

    # Extract the schedule type from the input string
    if "[" in input:
        run_type = input.split("[")[0]
    else:
        run_type = input.split("(")[0]

    # Find the appropriate handler function for the schedule type
    for prefix, handler in handlers.items():
        if run_type.startswith(prefix):
            run_dict = handler(input, run_dict, logger)
            break
    else:
        # Log an error and exit if the schedule type is not valid
        logger.error(f"Error: {run_type} is not a valid option.")
        exit()
    
    # Get current time and date information
    current_minutes = int(datetime.datetime.now().strftime("%M"))
    current_hour = int(datetime.datetime.now().strftime("%H"))
    day_of_week = days_of_week.get(datetime.datetime.now().strftime("%A").lower())
    current_date = int(datetime.datetime.now().strftime("%d"))
    
    # Create a table for schedule settings
    data = [
        ["Schedule Settings"],
    ]
    create_table(data, log_level="debug", logger=logger)
    logger.debug(f'{"Input:":<20}{input}\n')
    
    # Get schedule information from the run_dict
    run_day = run_dict.get('run_day')
    run_time = run_dict.get('run_time')
    run_date = run_dict.get('run_date')
    minutes = run_dict.get('minutes')
    type = run_dict.get('type')

    # Check if the current time matches the schedule for the script to run
    if run_type == "hourly" and current_minutes == minutes:
        return True
    elif run_type == "daily" and current_hour in run_time:
        return True
    elif run_type == "weekly" and current_hour == run_time and day_of_week in run_day:
        return True
    elif run_type == "monthly" and current_hour == run_time and current_date == run_date:
        return True
    elif run_type == "all":
        if type == "hourly" and current_minutes == minutes:
            return True
        elif type == "daily" and current_hour in run_time:
            return True
        elif type == "weekly":
            if minutes and current_hour == run_time and day_of_week in run_day and minutes == current_minutes:
                return True
            elif run_day and current_hour == run_time and day_of_week in run_day:
                return True
        elif type == "monthly" and current_hour == run_time and current_date == run_date:
            return True

    # Return False if the script should not run based on the current time
    return False

def handle_range(schedule, logger):
    """
    Handle the range schedule type.
    
    Args:
        schedule (str): The schedule string containing the range information
        logger (logger): The logger to use for logging output
        
    Returns:
        bool: True if the script should run, False otherwise
    """
    
    # Find all ranges in the schedule string using regular expression
    ranges = re.findall(r'range\((.*?)\)', schedule)
    
    # Clean and split the ranges
    ranges = [range.strip() for range in ranges]
    ranges = [range.split('|') for range in ranges]
    ranges = [item for sublist in ranges for item in sublist]
    
    # Get current month and date
    current_month = int(datetime.datetime.now().strftime("%m"))
    current_date = int(datetime.datetime.now().strftime("%d"))
    
    # Iterate through each date range and check if the current date falls within any range
    for date_range in ranges:
        # Extract start and end dates and months from the range string
        start_month = int(date_range.split("/")[0])
        start_date = int(date_range.split("/")[1].split("-")[0])
        end_month = int(date_range.split("-")[1].split("/")[0])
        end_date = int(date_range.split("-")[1].split("/")[1].split(")")[0])
        logger.debug(f"range({start_month}/{start_date}-{end_month}/{end_date})")

        # Check for invalid dates and months
        if not all(1 <= date <= 31 for date in [start_date, end_date]):
            logger.error("Error: Invalid date.")
            return False

        if not all(1 <= month <= 12 for month in [start_month, end_month]):
            logger.error("Error: Invalid month.")
            return False

        # Check for date range crossing over the turn of the year
        if start_month > end_month:
            # Check if the current date falls within the date range
            if (start_month == current_month and start_date <= current_date <= 31) or (end_month == current_month and 1 <= current_date <= end_date):
                return True

        # Check if the current date falls within the date range
        if (start_month == current_month and start_date <= current_date <= end_date):
            return True

    # Return False if the current date doesn't match any range
    return False