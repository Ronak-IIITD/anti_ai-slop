from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create image with gradient-like purple color
    img = Image.new('RGB', (size, size), '#667eea')
    draw = ImageDraw.Draw(img)
    
    # Add a shield shape (simplified)
    if size >= 48:
        # Draw a simple shield icon
        padding = size // 6
        draw.rectangle([padding, padding, size-padding, size-padding], 
                      fill='#764ba2', outline='white', width=2)
    
    img.save(filename)
    print(f"Created {filename}")

# Create icons
create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
