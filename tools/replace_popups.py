import re

def extract_balanced_parens(text, start_pos):
    """Extract content within balanced parentheses starting from start_pos."""
    if start_pos >= len(text) or text[start_pos] != '(':
        return None, start_pos
    
    depth = 0
    i = start_pos
    while i < len(text):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                return text[start_pos+1:i], i+1
        elif text[i] in ['"', "'"]:
            # Skip strings
            quote = text[i]
            i += 1
            while i < len(text):
                if text[i] == '\':
                    i += 2
                    continue
                if text[i] == quote:
                    break
                i += 1
        i += 1
    return None, start_pos

def find_popup_patterns(content):
    """Find all L.popup(...).setLatLng(...).setContent(...).openOn(map) patterns."""
    patterns = []
    
    # Look for L.popup( patterns
    pos = 0
    while True:
        pos = content.find('L.popup(', pos)
        if pos == -1:
            break
        
        # Check if this is already commented with our marker
        line_start = content.rfind('\n', 0, pos)
        line_end = content.find('\n', pos)
        if line_end == -1:
            line_end = len(content)
        line = content[line_start:line_end]
        
        # Skip if already converted
        if '// Show popup at standardized location' in line:
            pos += 1
            continue
        
        # Skip if this is part of the showStandardPopup function definition
        if 'return L.popup(popupOptions)' in line:
            pos += 1
            continue
            
        start_pos = pos
        pos += len('L.popup(')
        
        # Extract options
        options, next_pos = extract_balanced_parens(content, pos - 1)
        if options is None:
            pos = next_pos
            continue
        
        pos = next_pos
        
        # Skip whitespace and newlines
        while pos < len(content) and content[pos] in ' \t\n\r':
            pos += 1
        
        # Look for .setLatLng(
        if not content[pos:].startswith('.setLatLng('):
            continue
        
        pos += len('.setLatLng(')
        latlng, next_pos = extract_balanced_parens(content, pos - 1)
        if latlng is None:
            continue
        
        pos = next_pos
        
        # Skip whitespace
        while pos < len(content) and content[pos] in ' \t\n\r':
            pos += 1
        
        # Look for .setContent(
        if not content[pos:].startswith('.setContent('):
            continue
        
        pos += len('.setContent(')
        popup_content, next_pos = extract_balanced_parens(content, pos - 1)
        if popup_content is None:
            continue
        
        pos = next_pos
        
        # Skip whitespace
        while pos < len(content) and content[pos] in ' \t\n\r':
            pos += 1
        
        # Look for .openOn(map)
        if not content[pos:].startswith('.openOn(map)'):
            continue
        
        pos += len('.openOn(map)')
        end_pos = pos
        
        # Check for semicolon
        while end_pos < len(content) and content[end_pos] in ' \t\n\r':
            end_pos += 1
        if end_pos < len(content) and content[end_pos] == ';':
            end_pos += 1
        
        patterns.append({
            'start': start_pos,
            'end': end_pos,
            'options': options.strip(),
            'latlng': latlng.strip(),
            'content': popup_content.strip(),
            'full_text': content[start_pos:end_pos]
        })
        
        pos = end_pos
    
    return patterns

def replace_popup_patterns(content):
    """Replace all popup patterns with showStandardPopup calls."""
    patterns = find_popup_patterns(content)
    
    print(f"Found {len(patterns)} popup patterns to replace")
    
    # Replace from end to start to maintain positions
    patterns.sort(key=lambda x: x['start'], reverse=True)
    
    for i, pattern in enumerate(patterns):
        print(f"\n--- Pattern {i+1} ---")
        print(f"Line area: {content[:pattern['start']].count(chr(10)) + 1}")
        print(f"Original (first 150 chars):\n{pattern['full_text'][:150]}...")
        
        # Format the replacement
        options = pattern['options']
        content_param = pattern['content']
        
        # Build replacement
        if options:
            replacement = f"showStandardPopup({content_param}, {options})"
        else:
            replacement = f"showStandardPopup({content_param})"
        
        print(f"Replacement (first 150 chars):\n{replacement[:150]}...")
        
        # Apply replacement
        content = content[:pattern['start']] + replacement + content[pattern['end']:]
    
    return content

# Main execution
input_file = r"c:\Users\10145080\Downloads\Somalia Dashboard\script.js"

print(f"Reading {input_file}...")
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file size: {len(content)} bytes")

new_content = replace_popup_patterns(content)

print(f"\nNew file size: {len(new_content)} bytes")
print(f"Writing changes to {input_file}...")

with open(input_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
