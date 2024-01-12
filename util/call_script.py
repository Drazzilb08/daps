from subprocess import PIPE, STDOUT, CalledProcessError, CompletedProcess, Popen

from subprocess import Popen, PIPE, STDOUT, CompletedProcess, CalledProcessError

def call_script(command, logger):
    """
    Run a bash script
    
    Args: 
        command (list): The command to run
        logger (logger): The logger to use for logging output
        
    Returns:
        CompletedProcess: The completed process
    """
    # Print the command being executed
    print(f"Running command: {str(' '.join(command))}")
    
    # Execute the command and capture the output
    with Popen(command, text=True, stdout=PIPE, stderr=STDOUT) as process:
        for line in process.stdout:
            # Log each line of the output using the provided logger
            logger.info(line[:-1])  # Exclude the newline character

    # Retrieve the return code of the process
    retcode = process.poll()
    
    # If there is an error in the process, raise a CalledProcessError
    if retcode:
        raise CalledProcessError(retcode, process.args)
    
    # Return the CompletedProcess object
    return CompletedProcess(process.args, retcode)
