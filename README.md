# Inspector Saab 🔍

A powerful browser extension that lets you customize any webpage using natural language commands. Simply describe what you want to change, and Inspector Saab will make it happen, no coding needed!

![Version](https://img.shields.io/badge/version-4.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

- **Natural Language UI Customization**: Modify webpage elements using simple English commands
- **Real-time Changes**: See your modifications instantly
- **Smart Element Detection**: Automatically identifies and targets relevant page elements
- **User Authentication**: Secure Google OAuth integration
- **Cross-browser Support**: Works on Chromium-based browsers
- **Persistent Changes**: Options to save your customizations
- **Interactive UI**: User-friendly popup interface with real-time feedback

## 🚀 Demo

[![Watch the Demo](https://img.youtube.com/vi/8Ca8_znZgu8/0.jpg)](https://www.youtube.com/watch?v=8Ca8_znZgu8)

<img width="409" alt="Screenshot 2025-06-03 at 1 08 46 AM" src="https://github.com/user-attachments/assets/5411d2bf-f05e-45ca-891d-3962ac230873" />


## 🏗️ Architecture

The extension follows a modular architecture with three main components:

### 1. Popup Interface (`popup.js`, `popup.html`)
- Handles user input and authentication
- Manages the UI state and user feedback
- Communicates with the background script
- Processes AI responses

### 2. Background Script (`background.js`)
- Manages extension lifecycle
- Handles tab management
- Coordinates between popup and content scripts
- Manages authentication state

### 3. Content Script (`content.js`)
- Executes webpage modifications
- Handles DOM manipulation
- Manages element targeting
- Implements custom features (dark mode, reading progress, etc.)

### Flow Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Popup
    participant Background
    participant Content
    participant Backend

    User->>Popup: Enter modification request
    Popup->>Content: Get page HTML
    Content->>Popup: Return cleaned HTML
    Popup->>Backend: Send request + HTML
    Backend->>Popup: Return structured instructions
    Popup->>Background: Forward instructions
    Background->>Content: Execute modifications
    Content->>User: Show modified webpage
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Chrome/Edge browser

### Installation

1. Clone the repository:
\`\`\`bash
git clone [https://github.com/yourusername/inspector-saab.git](https://github.com/SarthakSri98/inspector-saab-frontend.git)
cd inspector-saab-frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`

3. Build the extension:
\`\`\`bash
npm run build
\`\`\`

4. Load in Chrome:
   - Open Chrome/Edge
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a feature branch:
\`\`\`bash
git checkout -b feature/amazing-feature
\`\`\`

3. Set up the development environment:
\`\`\`bash
npm install
npm run dev
\`\`\`

### Areas for Contribution

1. **Core Features**
   - Implement new UI modification commands
   - Add support for complex DOM operations
   - Improve element targeting accuracy
   - Add new UI themes

2. **Testing**
   - Add unit tests for core functions
   - Implement integration tests
   - Add end-to-end testing
   - Improve test coverage

3. **Documentation**
   - Improve inline code documentation
   - Add JSDoc comments
   - Create usage examples
   - Write tutorials

4. **Performance**
   - Optimize DOM operations
   - Implement caching
   - Reduce bundle size
   - Improve load times

5. **Browser Support**
   - Add Firefox support
   - Add Safari support
   - Ensure cross-browser compatibility

### Contribution Guidelines

1. **Code Style**
   - Use 2 spaces for indentation
   - Follow ESLint rules
   - Write meaningful commit messages
   - Add comments for complex logic

2. **Pull Request Process**
   - Create a feature branch
   - Make your changes
   - Add tests if applicable
   - Update documentation
   - Submit a PR with a clear description

3. **Testing Requirements**
   - Ensure all tests pass
   - Add tests for new features
   - Test across different browsers
   - Check for performance impacts

## 📝 Documentation

### API Reference

The extension uses several key APIs:

1. **Chrome Extension APIs**
   - `chrome.tabs`
   - `chrome.runtime`
   - `chrome.storage`
   - `chrome.scripting`

2. **Custom APIs**
   - `/api/auth/google` - Authentication
   - `/api/ai/process` - AI processing
   - `/api/ai/cleanhtml` - HTML processing

### Command Examples

\`\`\`javascript
// Example 1: Change background color
"Make the background color blue"

// Example 2: Modify text
"Make all headings bold and red"

// Example 3: Add features
"Add a dark mode toggle button"
\`\`\`

## 🔒 Security

- All API requests are authenticated
- Content security policy implemented
- Safe DOM manipulation practices
- Input sanitization
- Secure message passing

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors
- Built with Chrome Extension APIs
- Powered by AI technology
- Special thanks to the open-source community

## 📞 Contact

Sarthak Srivastava - [@linkedin](https://www.linkedin.com/in/sarthaksri98/)
Chrome extension Link: [Link](https://chromewebstore.google.com/detail/inspector-saab/ehjancnpaljecpdeohhjhnhodffoiilb)
# inspector-saab-frontend
