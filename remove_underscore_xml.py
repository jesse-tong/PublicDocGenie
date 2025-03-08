import os
import glob

# Specify the directory containing the XML files
directory = './dataset'  # Change this to your directory path

# Use glob to find all .xml files in the directory
xml_files = glob.glob(os.path.join(directory, '*.xml'))

# Loop through each file
for file_path in xml_files:
    # Read the content of the file
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove all underscores from the content and replace them with ' '
    modified_content = content.replace('_', ' ')
    
    # Write the modified content back to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(modified_content)
    
    print(f'Processed: {file_path}')
