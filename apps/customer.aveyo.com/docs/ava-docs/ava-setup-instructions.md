# Parent Website Setup Instructions

This guide provides step-by-step instructions for integrating the Ava AI authenticated chatbot into your existing website.

> Scope note: this is the **customer-facing embed integration**.  
> It is separate from internal support tooling hosted at `ava.aveyo.com/ava`.

## Prerequisites

- Your website must use HTTPS (SSL/TLS encryption)
- You need access to modify your website's HTML/JavaScript
- Users must have email addresses that exist in the Aveyo system

## Step 1: Include the Ava Script

Add the Ava authenticated embed script to your website. You can include it in one of these ways:

### Option A: In HTML Head (Recommended)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website</title>
    
    <!-- Add Ava script -->
    <script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
</head>
<body>
    <!-- Your website content -->
</body>
</html>
```

### Option B: Before Closing Body Tag
```html
<body>
    <!-- Your website content -->
    
    <!-- Add Ava script before closing body tag -->
    <script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
</body>
</html>
```

### Option C: Dynamic Loading (Advanced)
```javascript
// Load script dynamically
function loadAvaWidget() {
    const script = document.createElement('script');
    script.src = `${(window.NEXT_PUBLIC_CHATBOT_URL || 'https://ava-ai-chatbot.vercel.app').replace(/\/$/, '')}/embed/ava-auth-embed.js`;
    script.onload = function() {
        console.log('Ava widget loaded');
        // Initialize with session data here
    };
    document.head.appendChild(script);
}

// Call when needed
loadAvaWidget();
```

## Step 2: Set User Session Data

When a user logs into your website, pass their information to the Ava widget:

### Basic Implementation
```javascript
// After user successfully logs in
function onUserLogin(userData) {
    // Wait for Ava script to load
    if (window.AvaAuth) {
        window.AvaAuth.setSession({
            email: userData.email,        // REQUIRED: User's email
            userId: userData.id,          // Your internal user ID
            name: userData.fullName,      // User's display name
            token: userData.authToken     // Your authentication token (optional)
        });
    } else {
        // Script not loaded yet, wait and retry
        setTimeout(() => onUserLogin(userData), 100);
    }
}
```

### Advanced Implementation with Custom Data
```javascript
function onUserLogin(userData) {
    if (window.AvaAuth) {
        window.AvaAuth.setSession({
            email: userData.email,
            userId: userData.id,
            name: userData.fullName,
            token: userData.authToken,
            customData: {
                accountType: userData.accountType,
                subscriptionPlan: userData.plan,
                projectIds: userData.projectIds,
                lastLogin: new Date().toISOString(),
                preferences: userData.preferences
            }
        });
    }
}
```

## Step 3: Handle User Logout

Clear the Ava session when users log out:

```javascript
function onUserLogout() {
    // Your existing logout logic
    clearUserSession();
    redirectToLogin();
    
    // Clear Ava session
    if (window.AvaAuth) {
        window.AvaAuth.clearSession();
    }
}
```

## Step 4: Integration Examples by Platform

### WordPress
```php
<!-- In your theme's functions.php -->
<?php
function add_ava_widget() {
    if (is_user_logged_in()) {
        $current_user = wp_get_current_user();
        ?>
        <script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (window.AvaAuth) {
                window.AvaAuth.setSession({
                    email: '<?php echo $current_user->user_email; ?>',
                    userId: '<?php echo $current_user->ID; ?>',
                    name: '<?php echo $current_user->display_name; ?>',
                    customData: {
                        userRole: '<?php echo implode(",", $current_user->roles); ?>',
                        registrationDate: '<?php echo $current_user->user_registered; ?>'
                    }
                });
            }
        });
        </script>
        <?php
    }
}
add_action('wp_footer', 'add_ava_widget');
?>
```

### React/Next.js
```jsx
import { useEffect } from 'react';
import { useUser } from '../hooks/useUser'; // Your user hook

function AvaWidget() {
    const { user, isLoggedIn } = useUser();

    useEffect(() => {
        // Load Ava script
        const script = document.createElement('script');
        script.src = 'https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js';
        script.onload = () => {
            if (isLoggedIn && user && window.AvaAuth) {
                window.AvaAuth.setSession({
                    email: user.email,
                    userId: user.id,
                    name: user.name,
                    token: user.accessToken,
                    customData: {
                        plan: user.subscriptionPlan,
                        accountType: user.accountType
                    }
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup
            if (window.AvaAuth) {
                window.AvaAuth.clearSession();
            }
        };
    }, [user, isLoggedIn]);

    return null; // This component doesn't render anything
}

export default AvaWidget;
```

### Vue.js
```vue
<template>
  <!-- Your component template -->
</template>

<script>
export default {
  name: 'AvaWidget',
  mounted() {
    this.loadAvaWidget();
  },
  methods: {
    loadAvaWidget() {
      const script = document.createElement('script');
      script.src = `${(window.NEXT_PUBLIC_CHATBOT_URL || 'https://ava-ai-chatbot.vercel.app').replace(/\/$/, '')}/embed/ava-auth-embed.js`;
      script.onload = () => {
        if (this.$store.state.user.isLoggedIn && window.AvaAuth) {
          const user = this.$store.state.user.data;
          window.AvaAuth.setSession({
            email: user.email,
            userId: user.id,
            name: user.name,
            token: user.token,
            customData: {
              accountType: user.accountType,
              preferences: user.preferences
            }
          });
        }
      };
      document.head.appendChild(script);
    }
  },
  beforeDestroy() {
    if (window.AvaAuth) {
      window.AvaAuth.clearSession();
    }
  }
}
</script>
```

### Angular
```typescript
// ava-widget.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AvaWidgetService {
  private scriptLoaded = false;

  loadWidget(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js';
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setSession(userData: any): void {
    if ((window as any).AvaAuth) {
      (window as any).AvaAuth.setSession({
        email: userData.email,
        userId: userData.id,
        name: userData.name,
        token: userData.token,
        customData: userData.customData
      });
    }
  }

  clearSession(): void {
    if ((window as any).AvaAuth) {
      (window as any).AvaAuth.clearSession();
    }
  }
}

// app.component.ts
import { Component, OnInit } from '@angular/core';
import { AvaWidgetService } from './services/ava-widget.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  constructor(
    private avaWidget: AvaWidgetService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    await this.avaWidget.loadWidget();
    
    this.auth.user$.subscribe(user => {
      if (user) {
        this.avaWidget.setSession(user);
      } else {
        this.avaWidget.clearSession();
      }
    });
  }
}
```

## Step 5: Testing the Integration

### 1. Basic Functionality Test
```javascript
// Test script loading
console.log('AvaAuth available:', !!window.AvaAuth);

// Test session setting
window.AvaAuth.setSession({
    email: 'test@example.com',
    userId: 'test123',
    name: 'Test User'
});

// Test widget opening
window.AvaAuth.open();
```

### 2. Session Verification
```javascript
// Check current session
const currentSession = window.AvaAuth.getSession();
console.log('Current session:', currentSession);

// Check if widget is open
console.log('Widget is open:', window.AvaAuth.isOpen());
```

## Step 6: Styling Considerations

### Z-Index Conflicts
If the Ava widget appears behind other elements:

```css
/* Ensure your elements don't conflict */
.your-modal, .your-dropdown {
    z-index: 9999; /* Less than Ava's 10000 */
}

/* Or increase Ava's z-index if needed */
#ava-auth-iframe-button,
#ava-auth-iframe-widget {
    z-index: 99999 !important;
}
```

### Mobile Responsiveness
The widget is responsive by default, but ensure your site doesn't interfere:

```css
/* Ensure mobile viewport is set */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* Avoid fixed positioning conflicts on mobile */
@media (max-width: 768px) {
    .your-fixed-elements {
        bottom: 100px; /* Leave space for Ava button */
    }
}
```

## Step 7: Security Best Practices

### 1. Token Security
```javascript
// Use short-lived tokens
window.AvaAuth.setSession({
    email: user.email,
    userId: user.id,
    name: user.name,
    token: user.shortLivedToken, // Expires in 1 hour
    customData: {
        // Don't include sensitive data
        accountType: user.accountType,
        // Avoid: creditCardNumber, ssn, passwords
    }
});
```

### 2. Data Validation
```javascript
function setAvaSession(userData) {
    // Validate required fields
    if (!userData.email || !userData.email.includes('@')) {
        console.error('Invalid email for Ava session');
        return;
    }

    // Sanitize data
    const cleanData = {
        email: userData.email.toLowerCase().trim(),
        userId: String(userData.id),
        name: userData.name ? userData.name.trim() : '',
        token: userData.token
    };

    window.AvaAuth.setSession(cleanData);
}
```

## Step 8: Error Handling

### Script Loading Errors
```javascript
function loadAvaWithRetry(maxRetries = 3) {
    let retries = 0;
    
    function attemptLoad() {
        const script = document.createElement('script');
        script.src = `${(window.NEXT_PUBLIC_CHATBOT_URL || 'https://ava-ai-chatbot.vercel.app').replace(/\/$/, '')}/embed/ava-auth-embed.js`;
        
        script.onload = function() {
            console.log('Ava widget loaded successfully');
            initializeAvaSession();
        };
        
        script.onerror = function() {
            retries++;
            if (retries < maxRetries) {
                console.warn(`Ava script load failed, retrying... (${retries}/${maxRetries})`);
                setTimeout(attemptLoad, 2000);
            } else {
                console.error('Failed to load Ava widget after maximum retries');
            }
        };
        
        document.head.appendChild(script);
    }
    
    attemptLoad();
}
```

### Session Errors
```javascript
function setAvaSessionSafely(userData) {
    try {
        if (!window.AvaAuth) {
            throw new Error('Ava widget not loaded');
        }
        
        if (!userData.email) {
            throw new Error('Email is required for Ava session');
        }
        
        window.AvaAuth.setSession(userData);
        console.log('Ava session set successfully');
        
    } catch (error) {
        console.error('Failed to set Ava session:', error);
        // Optionally report to your error tracking service
    }
}
```

## Step 9: Monitoring and Analytics

### Track Widget Usage
```javascript
// Track when widget is opened
function trackAvaOpen() {
    // Your analytics code
    gtag('event', 'ava_widget_opened', {
        'event_category': 'engagement',
        'event_label': 'chatbot'
    });
}

// Override open method to include tracking
const originalOpen = window.AvaAuth?.open;
if (originalOpen) {
    window.AvaAuth.open = function() {
        trackAvaOpen();
        return originalOpen.call(this);
    };
}
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check HTTPS requirement
   - Verify script loaded successfully
   - Check browser console for errors

2. **Session not working**
   - Ensure email is provided
   - Verify user exists in Aveyo system
   - Check session data format

3. **Authentication failures**
   - Validate token format and expiration
   - Check user permissions
   - Verify API connectivity

### Debug Mode
```javascript
// Enable debug logging
window.AvaAuthDebug = true;

// Check widget status
console.log('Widget loaded:', !!window.AvaAuth);
console.log('Current session:', window.AvaAuth?.getSession());
console.log('Widget open:', window.AvaAuth?.isOpen());
```

## Support

For technical support during integration:
- **Email**: customercare@aveyo.com
- **Phone**: (385) 469-3838
- **Documentation**: https://ava-ai-chatbot.vercel.app/auth-iframe-demo

## Next Steps

1. Implement the basic integration
2. Test with a few users
3. Monitor for any issues
4. Roll out to all users
5. Consider advanced features like custom styling or analytics integration
