# Ava AI Portal Integration Package

This package contains everything you need to integrate the Ava AI chatbot into your existing customer portal or website with seamless authentication pass-through.

## What's Included

- **Setup Instructions** - Complete step-by-step integration guide
- **Integration Checklist** - Ensure nothing is missed during implementation  
- **Code Templates** - Ready-to-use code examples for different platforms
- **Testing Tools** - Validate your integration works correctly

## Quick Start

1. **Read the Setup Instructions** (`SETUP-INSTRUCTIONS.md`)
2. **Follow the Integration Checklist** (`INTEGRATION-CHECKLIST.md`) 
3. **Use the Code Template** (`integration-template.html`)
4. **Test Your Integration** using the provided examples

## Key Benefits

- **Single Sign-On**: Users authenticate once on your website
- **Seamless Experience**: No additional login required for chatbot
- **Secure Integration**: Session data passed securely via HTTPS
- **Easy Implementation**: Simple JavaScript API
- **Cross-Platform**: Works with any web technology

## Parent Website Requirements

### Technical Requirements
- **HTTPS Required**: Your website must use SSL/TLS encryption
- **JavaScript Access**: Ability to add/modify JavaScript on your website
- **User Email Access**: Access to logged-in users' email addresses
- **Modern Browsers**: Support for ES6+ JavaScript features

### User Requirements  
- **Aveyo System**: User emails must exist in the Aveyo customer database
- **Active Projects**: Users should have solar projects in the system
- **Valid Sessions**: Users must be logged into your website

### Integration Steps Summary

1. **Add Script**: Include one line of JavaScript
   ```html
   <script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
   ```

2. **Set Session**: Pass user data when they log in
   ```javascript
   window.AvaAuth.setSession({
     email: user.email,
     userId: user.id, 
     name: user.name
   });
   ```

3. **Clear Session**: Remove data when they log out
   ```javascript
   window.AvaAuth.clearSession();
   ```

That's it! The Ava chatbot will appear as a floating button and users can access their project information without additional login.

## Platform Examples

### WordPress
```php
<?php if (is_user_logged_in()): ?>
<script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
<script>
window.AvaAuth.setSession({
    email: '<?php echo wp_get_current_user()->user_email; ?>',
    userId: '<?php echo get_current_user_id(); ?>',
    name: '<?php echo wp_get_current_user()->display_name; ?>'
});
</script>
<?php endif; ?>
```

### React/Next.js
```jsx
useEffect(() => {
  if (user?.email) {
    window.AvaAuth?.setSession({
      email: user.email,
      userId: user.id,
      name: user.name
    });
  }
}, [user]);
```

### Plain JavaScript
```javascript
// After user login
function onUserLogin(userData) {
  window.AvaAuth.setSession({
    email: userData.email,
    userId: userData.id,
    name: userData.name
  });
}
```

## Support

- **Email**: customercare@aveyo.com
- **Phone**: (385) 469-3838  
- **Demo**: https://ava-ai-chatbot.vercel.app/auth-iframe-demo

## Files in This Package

- `README.md` - This overview document
- `SETUP-INSTRUCTIONS.md` - Detailed integration instructions
- `INTEGRATION-CHECKLIST.md` - Step-by-step checklist
- `integration-template.html` - Working code template

## Next Steps

1. Review the setup instructions
2. Plan your integration approach
3. Implement using the provided templates
4. Test thoroughly using the checklist
5. Deploy to production
6. Monitor and optimize
