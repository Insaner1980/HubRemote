# JellyRemote

A Jellyfin remote control and media player application built with Tauri 2.0, React, and TypeScript.

## Features

- Browse and manage your Jellyfin media library
- Remote control for Jellyfin playback sessions
- Local video playback using MPV
- Dark cinema theme with red accent

## Prerequisites

### Node.js
- Node.js 18+ and npm

### Rust
- Rust 1.70+ (install via [rustup](https://rustup.rs/))

### MPV (Required for local video playback)

The application uses [libmpv](https://mpv.io/) for video playback. You need to install MPV on your system.

#### Windows

**Option 1: Using Chocolatey**
```powershell
choco install mpv
```

**Option 2: Manual Installation**
1. Download MPV from [mpv.io](https://mpv.io/installation/) or [SourceForge](https://sourceforge.net/projects/mpv-player-windows/files/)
2. Extract to a folder (e.g., `C:\mpv`)
3. Add the folder to your system PATH
4. Ensure `mpv-2.dll` (or `libmpv-2.dll`) is accessible

**Option 3: Using the dev kit**
1. Download the mpv dev package from [SourceForge](https://sourceforge.net/projects/mpv-player-windows/files/libmpv/)
2. Extract and copy `mpv-2.dll` to your project's `src-tauri` folder or system PATH

#### macOS

**Using Homebrew:**
```bash
brew install mpv
```

#### Linux

**Debian/Ubuntu:**
```bash
sudo apt install libmpv-dev mpv
```

**Fedora:**
```bash
sudo dnf install mpv mpv-devel
```

**Arch Linux:**
```bash
sudo pacman -S mpv
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Insaner1980/JellyRemote.git
cd JellyRemote
```

2. Install dependencies:
```bash
npm install
```

3. Build the Rust backend:
```bash
cd src-tauri
cargo build
cd ..
```

## Development

Start the development server:
```bash
npm run tauri dev
```

This will start both the Vite dev server and the Tauri application in development mode.

## Building

Build the application for production:
```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/`.

## Project Structure

```
jellyremote/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── stores/             # Zustand stores
│   └── types/              # TypeScript types
├── src-tauri/              # Tauri/Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri commands
│   │   ├── mpv.rs          # MPV player wrapper
│   │   ├── lib.rs          # Main library
│   │   └── main.rs         # Entry point
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json            # Node.js dependencies
```

## MPV Integration

The application integrates with MPV for local video playback. The following commands are available from the frontend:

| Command | Description |
|---------|-------------|
| `play_video(url)` | Play a video from URL |
| `play_video_with_options(options)` | Play with start position and auth headers |
| `pause_video()` | Pause playback |
| `resume_video()` | Resume playback |
| `toggle_playback()` | Toggle play/pause |
| `stop_video()` | Stop playback |
| `seek_video(position)` | Seek to position (seconds) |
| `seek_video_relative(offset)` | Seek relative to current position |
| `set_volume(volume)` | Set volume (0-100) |
| `get_volume()` | Get current volume |
| `toggle_mute()` | Toggle mute |
| `set_mute(muted)` | Set mute state |
| `get_playback_state()` | Get full playback state |
| `get_position()` | Get current position |
| `get_duration()` | Get total duration |
| `set_audio_track(index)` | Set audio track |
| `set_subtitle_track(index)` | Set subtitle track |
| `set_playback_speed(speed)` | Set playback speed |

## Troubleshooting

### MPV not found

If you get an error about MPV not being found:

1. Ensure MPV is installed and the DLL is in your PATH
2. On Windows, you may need to copy `mpv-2.dll` to:
   - The application directory
   - `C:\Windows\System32`
   - Or add the MPV folder to your PATH

### Video playback issues

- Ensure your Jellyfin server allows direct play
- Check that the video format is supported by MPV
- Try enabling hardware decoding in MPV settings

## License

MIT License
