import time

def color(text, color):
    colors = {
        'black': '\033[30m',
        'red': '\033[31m',
        'green': '\033[32m',
        'yellow': '\033[33m',
        'blue': '\033[34m',
        'orange': '\033[91m',
        'magenta': '\033[35m',
        'cyan': '\033[36m',
        'white': '\033[37m',
        'reset': '\033[0m'
    }
    #Convert int ot str
    if isinstance(text, int):
        text = str(text)
    if color in colors:
        return colors[color] + text + colors['reset']
    else:
        return text

def format_box(text, width=None):
    lines = text.splitlines()
    max_length = max(len(line) for line in lines) if lines else 0
    content_width = max_length if width is None else min(max_length, width - 4)

    formatted_lines = []
    formatted_lines.append('╔' + '═' * (content_width + 2) + '╗')
    for line in lines:
        formatted_lines.append('║ ' + line.ljust(content_width) + ' ║')
    formatted_lines.append('╚' + '═' * (content_width + 2) + '╝')

    return '\n'.join(formatted_lines)

def rainbow_text(text):
    colors = [31, 33, 32, 36, 34, 35]
    for char in text:
        print(f"\033[38;5;{colors[0]}m{char}\033[0m", end="", flush=True)
        colors.append(colors.pop(0))
        time.sleep(0.1)