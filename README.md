# OpenRacer 🎿

Open-source ski race timing system - built to break monopolies and empower race operators.

## Features

✅ **Modern, Professional UI** - Clean, dark-themed interface that looks great  
✅ **Offline-First Architecture** - Works perfectly without internet connection  
✅ **Smart Update System** - Checks for updates, with multiple installation options:
  - Download and install now
  - Download in background, install on restart
  - Install from USB drive (for metered connections)
  - Skip specific versions
✅ **Subscription Management** - Built-in support for freemium model  
✅ **Cross-Platform** - Windows, macOS, Linux support  
✅ **USB Portable** - Can run directly from USB drive  

## Technology Stack

- **Electron** - Cross-platform desktop framework
- **Node.js** - Backend processing
- **Vanilla JavaScript** - Fast, lightweight frontend
- **electron-builder** - Packaging and distribution

## Prerequisites

- Node.js (v18 or higher) - [Download here](https://nodejs.org/)
- Git - [Download here](https://git-scm.com/)
- VS Code (recommended) - [Download here](https://code.visualstudio.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/openracer.git
cd openracer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm run dev
```

The app will launch with developer tools open for debugging.

## Project Structure

```
openracer/
├── main.js           # Main Electron process (backend)
├── preload.js        # Secure bridge between main and renderer
├── renderer.js       # UI logic and interactions
├── index.html        # Application UI
├── package.json      # Project configuration
├── assets/           # Icons and images
│   ├── icon.png      # Linux icon
│   ├── icon.ico      # Windows icon
│   └── icon.icns     # macOS icon
└── README.md         # This file
```

## Building for Distribution

### Windows (Installer + Portable)

```bash
npm run build:win
```

Creates both an installer and a portable .exe in `dist/` folder

### macOS

```bash
npm run build:mac
```

Creates a .dmg installer in `dist/` folder

### Linux

```bash
npm run build:linux
```

Creates AppImage and .deb packages in `dist/` folder

### All Platforms

```bash
npm run build
```

## Development Workflow

1. **Make changes** to any file
2. **Save** the file
3. **Reload** the app (Ctrl/Cmd + R in the app window)
4. **Test** your changes

## Key Files Explained

### main.js

The "backend" of your app. Handles:

- Window creation and management
- Internet connectivity checks
- Update checking from GitHub releases
- Configuration file management
- Subscription status tracking
- IPC (Inter-Process Communication) with the UI

### preload.js

Security layer that safely exposes specific functions to the UI without giving it full access to Node.js APIs.

### renderer.js

The "frontend" JavaScript. Handles:

- UI interactions and updates
- Calling backend functions via IPC
- Notification display
- Modal dialogs

### index.html

The actual UI structure and styling. Built with modern CSS including:

- Glassmorphism effects
- Smooth animations
- Responsive design
- Dark theme

## Configuration Files

The app stores configuration in:

- **Windows**: `%APPDATA%/openracer/config/`
- **macOS**: `~/Library/Application Support/openracer/config/`
- **Linux**: `~/.config/openracer/config/`

Configuration includes:

- Update preferences
- Subscription status
- Last update check time
- Skipped version tracking

## Update System

The update system is designed to work in three modes:

1. **Online with Internet**: Checks GitHub releases automatically
2. **Offline Mode**: Gracefully disables update checks
3. **USB Installation**: Users can download updates elsewhere and install from file

### Setting Up GitHub Releases

1. Create a release on GitHub with a version tag (e.g., `v1.0.1`)
2. Upload your built installers as release assets
3. The app will automatically detect and offer the update

## Modular Architecture

The code is designed to be modular. Future features can be added as:

- New IPC handlers in `main.js`
- New exposed APIs in `preload.js`
- New UI components in `index.html`
- New interaction handlers in `renderer.js`

This means you can add features like:

- Race timing modules
- Database integration
- Print functionality
- Real-time leaderboards
- Racer notifications

...without rewriting the core app structure.

## Next Steps

1. **Race timing interface** - Start/stop, gate triggers
2. **Racer database** - Manage participant information
3. **Results display** - Real-time leaderboards
4. **Data persistence** - SQLite or JSON-based storage
5. **Export functionality** - PDF results, CSV data
6. **Multi-race support** - Run multiple courses simultaneously
7. **Hardware integration** - Connect timing gates/sensors

## VS Code Extensions (Recommended)

- **ESLint** - Code quality
- **Prettier** - Code formatting
- **GitLens** - Git integration
- **Electron Debug** - Debugging support

## Premium Features (Planned)

- Cloud sync
- Remote registration and course management
- Advanced analytics and reporting
- One-click updates (vs manual)
- Custom logo on printouts
- Access to global racer database

## Contributing

This is open source! Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/datrix83864/openracer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/datrix83864/openracer/discussions)

---

Built with ❤️ by the OpenRacer community to make ski racing accessible to everyone.
