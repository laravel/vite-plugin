# Potential Bugs

## Development server exits without any errors a second after starting it

If your development server keeps exiting almost immediately after starting, try running this command (for Linux users only).
`echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`

Sometimes, the development server is silently exiting because there aren't enough file watchers. 
This workaround addresses https://github.com/laravel/vite-plugin/issues/15
