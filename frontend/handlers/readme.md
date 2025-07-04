# Inspector Saab Chrome Extension

AI-powered DOM manipulation extension that allows users to modify web pages using natural language descriptions.

## 🚀 Quick Start

### Installation
1. Clone the repository
2. Run `npm run build` to build the extension
3. Load the `dist/` folder in Chrome Extensions (Developer Mode)
4. Pin the extension and start using it!

### Usage
1. Click the Inspector Saab extension icon
2. Log in with your Google account
3. Enter a description of what you want to change (e.g., "Change background color to blue")
4. Click "Apply Changes" and watch the magic happen!

---

## 🔧 Handler System Architecture

Inspector Saab uses a **centralized handler registry system** that makes it easy to add new DOM manipulation capabilities.

### How It Works
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Response   │───▶│  Handler Registry │───▶│  DOM Execution  │
│   (Instructions)│    │  (Auto-registered)│    │   (Live Page)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Current Built-in Handlers
- **Reading Progress Bar** - Shows scroll progress at top of page
- **Back to Top Button** - Smooth scroll to top functionality
- **Dark Mode Toggle** - Inverts page colors for dark theme
- **Content Highlighting** - AI-powered text highlighting

---

## 📝 Adding a New Handler - Step by Step Guide

### Step 1: Understand the Handler Structure

Every handler is a **JavaScript function** that receives a `selector` parameter and performs DOM manipulation:

```javascript
function myHandlerFunction(selector) {
  console.log(`🎯 My handler called with selector: ${selector}`)

  // Find the target element
  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Element not found for selector: ${selector}`)
    return
  }

  // Perform your DOM manipulation
  // ... your logic here ...

  console.log(`✅ My handler completed successfully`)
}
```

### Step 2: Add Your Handler to the Registry

Open `frontend/handlers/index.js` and add your handler inside the IIFE:

```javascript
// Inside the IIFE in frontend/handlers/index.js

// Your new handler function
function addCustomAnimation(selector) {
  console.log(`🎨 Custom Animation handler called with selector: ${selector}`)

  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Custom Animation: Element not found for selector: ${selector}`)
    return
  }

  // Add animation class
  element.style.transition = 'all 0.3s ease'
  element.style.transform = 'scale(1.1)'

  // Reset after animation
  setTimeout(() => {
    element.style.transform = 'scale(1)'
  }, 300)

  console.log(`✅ Custom Animation: Successfully applied to ${selector}`)
}

// Register your handler (ADD THIS LINE)
HandlerRegistry.register('addCustomAnimation', addCustomAnimation)
```

### Step 3: Test Your Handler

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Reload the extension** in Chrome Extensions page

3. **Test on a webpage:**
   - Open any webpage
   - Open Inspector Saab popup
   - Enter a description that would trigger your handler
   - Example: "Add a scaling animation to the main heading"

4. **Check the console** for your debug logs:
   - Open Developer Tools (F12)
   - Look for your handler's console messages

### Step 4: Handler Best Practices

#### ✅ DO:
```javascript
function goodHandler(selector) {
  // 1. Add descriptive logging
  console.log(`🎯 Handler called with selector: ${selector}`)

  // 2. Validate inputs
  if (!selector) {
    console.error('Handler: No selector provided')
    return
  }

  // 3. Check if element exists
  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Handler: Element not found for selector: ${selector}`)
    return
  }

  // 4. Handle errors gracefully
  try {
    // Your DOM manipulation here
    element.style.backgroundColor = 'blue'
    console.log(`✅ Handler: Successfully applied to ${selector}`)
  } catch (error) {
    console.error('Handler: Error during execution:', error)
  }
}
```

#### ❌ DON'T:
```javascript
function badHandler(selector) {
  // Don't assume element exists
  document.querySelector(selector).style.color = 'red' // Could crash!

  // Don't forget error handling
  // Don't skip logging
  // Don't use global variables
}
```

### Step 5: Advanced Handler Features

#### Multiple Element Support
```javascript
function handleMultipleElements(selector) {
  const elements = document.querySelectorAll(selector) // Note: querySelectorAll

  if (elements.length === 0) {
    console.warn(`No elements found for selector: ${selector}`)
    return
  }

  elements.forEach((element, index) => {
    // Apply to each element
    element.style.opacity = '0.8'
    console.log(`✅ Applied to element ${index + 1}/${elements.length}`)
  })
}
```

#### Event Listeners
```javascript
function addClickHandler(selector) {
  const element = document.querySelector(selector)
  if (!element) return

  // Remove existing listeners to prevent duplicates
  element.removeEventListener('click', handleClick)

  function handleClick() {
    console.log('Element clicked!')
    element.style.backgroundColor = 'yellow'
  }

  element.addEventListener('click', handleClick)
  console.log(`✅ Click handler added to ${selector}`)
}
```

#### CSS Animations
```javascript
function addFadeInAnimation(selector) {
  const element = document.querySelector(selector)
  if (!element) return

  // Inject CSS if not already present
  if (!document.getElementById('fade-in-styles')) {
    const style = document.createElement('style')
    style.id = 'fade-in-styles'
    style.textContent = `
      .fade-in-animation {
        animation: fadeIn 1s ease-in-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }

  element.classList.add('fade-in-animation')
}
```

---

## 🧪 Testing Your Handler

### Manual Testing Checklist
- [ ] Handler registers without errors (check console)
- [ ] Handler executes when triggered by AI
- [ ] Error handling works (test with invalid selectors)
- [ ] No memory leaks (remove event listeners properly)
- [ ] Works on different websites
- [ ] Console logs are helpful for debugging

### Debug Your Handler
```javascript
// Add this temporary debug function to test your handler directly
function debugMyHandler() {
  console.log('🔍 Testing handler directly...')

  // Test with a known selector
  myHandlerFunction('body') // or any selector you know exists

  // Check if handler is registered
  console.log('Available handlers:', Object.keys(window.InspectorSaabHandlers || {}))
}

// Call in browser console: debugMyHandler()
```

---

## 🎯 Handler Examples

### Example 1: Simple Style Change
```javascript
function addRedBorder(selector) {
  console.log(`🔴 Adding red border to: ${selector}`)

  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Red Border: Element not found for selector: ${selector}`)
    return
  }

  element.style.border = '3px solid red'
  element.style.borderRadius = '5px'

  console.log(`✅ Red Border: Successfully applied to ${selector}`)
}

// Register it
HandlerRegistry.register('addRedBorder', addRedBorder)
```

### Example 2: Interactive Feature
```javascript
function addHoverEffect(selector) {
  console.log(`✨ Adding hover effect to: ${selector}`)

  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Hover Effect: Element not found for selector: ${selector}`)
    return
  }

  const originalBackground = element.style.backgroundColor

  element.addEventListener('mouseenter', () => {
    element.style.backgroundColor = '#f0f0f0'
    element.style.cursor = 'pointer'
  })

  element.addEventListener('mouseleave', () => {
    element.style.backgroundColor = originalBackground
  })

  console.log(`✅ Hover Effect: Successfully applied to ${selector}`)
}

// Register it
HandlerRegistry.register('addHoverEffect', addHoverEffect)
```

### Example 3: Complex Animation
```javascript
function addPulseAnimation(selector) {
  console.log(`💓 Adding pulse animation to: ${selector}`)

  const element = document.querySelector(selector)
  if (!element) {
    console.error(`Pulse Animation: Element not found for selector: ${selector}`)
    return
  }

  // Inject CSS for pulse animation
  if (!document.getElementById('pulse-animation-styles')) {
    const style = document.createElement('style')
    style.id = 'pulse-animation-styles'
    style.textContent = `
      .pulse-animation {
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `
    document.head.appendChild(style)
  }

  element.classList.add('pulse-animation')

  console.log(`✅ Pulse Animation: Successfully applied to ${selector}`)
}

// Register it
HandlerRegistry.register('addPulseAnimation', addPulseAnimation)
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Handler not found" Error
```javascript
// Check if handler is registered
console.log('Available handlers:', Object.keys(window.InspectorSaabHandlers || {}))

// Make sure you added the registration line:
HandlerRegistry.register('yourHandlerName', yourHandlerFunction)
```

#### Handler Not Executing
1. **Check the console** for error messages
2. **Verify selector** is valid: `document.querySelector('your-selector')`
3. **Test handler directly**: Call it manually in console
4. **Check AI response** includes your handler name

#### Element Not Found
```javascript
// Debug selector issues
function debugSelector(selector) {
  console.log('Testing selector:', selector)
  const element = document.querySelector(selector)
  console.log('Found element:', element)

  if (!element) {
    console.log('Available elements:')
    console.log('- All divs:', document.querySelectorAll('div').length)
    console.log('- All with IDs:', document.querySelectorAll('[id]').length)
    console.log('- All with classes:', document.querySelectorAll('[class]').length)
  }
}
```

### Debug Mode
Enable detailed logging by adding this to your handler:
```javascript
const DEBUG = true // Set to false for production

function myHandler(selector) {
  if (DEBUG) {
    console.log('🐛 DEBUG: Handler starting')
    console.log('🐛 DEBUG: Selector:', selector)
    console.log('🐛 DEBUG: Available handlers:', Object.keys(window.InspectorSaabHandlers || {}))
  }

  // Your handler logic...
}
```

---

## 🤝 Contributing Guidelines

### Before Submitting a Handler
1. **Test thoroughly** on multiple websites
2. **Add comprehensive logging** for debugging
3. **Handle edge cases** (missing elements, invalid inputs)
4. **Follow naming conventions**: `addFeatureName` or `toggleFeatureName`
5. **Document your handler** with comments

### Code Style
- Use **descriptive function names**: `addSmoothScrolling` not `scroll`
- Add **emoji logs** for easy identification: `console.log('🎯 Handler starting...')`
- **Handle errors gracefully** - don't crash the extension
- **Clean up after yourself** - remove event listeners when needed

### Pull Request Checklist
- [ ] Handler function implemented and tested
- [ ] Handler registered in `HandlerRegistry.register()`
- [ ] Console logging added for debugging
- [ ] Error handling implemented
- [ ] Tested on multiple websites
- [ ] No console errors or warnings
- [ ] Documentation updated (if needed)

---

## 📚 Technical Architecture

### File Structure
```
frontend/
├── handlers/
│   └── index.js          # Handler registry and all handlers
├── content.js            # Content script (DOM manipulation)
├── background.js         # Service worker (message routing)
├── popup.js             # Popup UI logic
└── popup.html           # Popup interface
```

### Message Flow
```
Popup → Background → Content Script → Handler Registry → DOM
  ↑                                                        ↓
  └─────────────── Response ←─────────────────────────────┘
```

### Handler Lifecycle
1. **Registration**: Handler registered in `HandlerRegistry`
2. **AI Processing**: AI generates instructions with handler name
3. **Message Passing**: Instructions sent to content script
4. **Execution**: Handler called with selector parameter
5. **DOM Manipulation**: Handler modifies the page

---

## 🎉 Ready to Contribute?

The new handler system makes it incredibly easy to add new features to Inspector Saab!

**Your first handler could be:**
- Image filters (blur, brightness, contrast)
- Text animations (typewriter, fade-in)
- Layout modifications (sticky headers, floating elements)
- Accessibility improvements (font size, contrast)
- Interactive features (tooltips, modals)

**Happy coding! 🚀**

---

## 📞 Support

If you run into issues:
1. Check the browser console for error messages
2. Review this documentation
3. Look at existing handler examples
4. Open an issue with detailed information

**Let's make the web more interactive, one handler at a time! ✨**
