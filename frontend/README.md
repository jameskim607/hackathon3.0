# LMS Frontend

A modern, responsive frontend for the Learning Management System built with vanilla HTML, CSS, and JavaScript.

## Features

- **Student Portal** (`index.html`) - Browse and search educational resources
- **Teacher Dashboard** (`upload.html`) - Upload and manage educational content
- **Authentication** (`login.html`, `signup.html`) - User registration and login
- **Mobile Responsive** - Optimized for all device sizes
- **Modern UI/UX** - Clean, intuitive interface with smooth animations

## Pages

### 1. Student Portal (index.html)
- Advanced search with filters (subject, grade, country, language)
- Resource grid/list view toggle
- Language preferences with AI translation option
- Resource cards with ratings and metadata
- Pagination for large resource collections

### 2. Teacher Dashboard (upload.html)
- Comprehensive resource upload form
- File drag & drop support
- Form validation and error handling
- Progress tracking and success feedback
- Role-based access control

### 3. Authentication (login.html, signup.html)
- Clean, modern authentication forms
- Password strength indicators
- Role selection (student/teacher/admin)
- Social login options (placeholder)
- Responsive design for mobile devices

## Setup

1. **Backend Connection**: Update `API_BASE_URL` in `script.js` to point to your backend
2. **File Structure**: Ensure all HTML files are in the same directory as `styles.css` and `script.js`
3. **Web Server**: Serve the files through a web server (local development server recommended)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Local Storage API

## Dependencies

- **Font Awesome 6.0.0** - Icons (loaded from CDN)
- **No build tools required** - Pure vanilla implementation

## Customization

### Colors
Update CSS custom properties in `:root` section of `styles.css`:
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --accent-color: #f59e0b;
    /* ... more colors */
}
```

### API Endpoints
Modify the `API_BASE_URL` constant in `script.js`:
```javascript
const API_BASE_URL = 'https://your-backend-url.com';
```

### Styling
The CSS uses a modular approach with:
- Component-based styling
- CSS custom properties for theming
- Responsive breakpoints
- Utility classes

## Development

### Adding New Features
1. Create HTML structure
2. Add CSS styles following the existing pattern
3. Implement JavaScript functionality
4. Test across different screen sizes

### File Organization
- `styles.css` - All styling and responsive design
- `script.js` - Application logic and API integration
- HTML files - Page structure and content

## Responsive Design

The frontend is built with a mobile-first approach:
- **Mobile**: Single column layouts, touch-friendly buttons
- **Tablet**: Optimized grid layouts, improved spacing
- **Desktop**: Full-featured interfaces with hover effects

## Performance

- Minimal JavaScript bundle size
- Efficient DOM manipulation
- Lazy loading for large resource lists
- Optimized CSS with minimal repaints

## Security

- Input validation and sanitization
- XSS protection through proper escaping
- Secure authentication flow
- Role-based access control

## Future Enhancements

- Progressive Web App (PWA) features
- Offline support
- Advanced search filters
- Real-time notifications
- Dark mode theme
- Accessibility improvements


