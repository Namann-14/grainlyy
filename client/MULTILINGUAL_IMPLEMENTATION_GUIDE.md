# 🌍 Multilingual Implementation Guide

## Overview
This guide explains how to implement multilingual support across all pages in the Grainlyy application. We currently support 7 languages with a React Context-based translation system.

## 📚 Supported Languages
- 🇺🇸 **English (en)** - Default
- 🇮🇳 **Hindi (hi)** - हिन्दी  
- 🇮🇳 **Tamil (ta)** - தமிழ்
- 🇧🇹 **Dzongkha (dz)** - རྫོང་ཁ
- 🇳🇵 **Nepali (ne)** - नेपाली
- 🇧🇩 **Bengali (bn)** - বাংলা
- 🇱🇰 **Sinhala (si)** - සිංහල

## 🗂️ File Structure

### Current Status
✅ **Main Page (/)** - Fully implemented in all 7 languages
- File: `locales/{lang}/common.json`

### To Be Implemented
```
locales/
├── en/
│   ├── common.json          ✅ DONE
│   ├── auth.json           ❌ TODO - Login/Signup pages
│   ├── admin.json          ❌ TODO - Admin dashboard  
│   ├── user.json           ❌ TODO - User dashboard
│   ├── dealer.json         ❌ TODO - Dealer pages
│   ├── delivery.json       ❌ TODO - Delivery pages
│   ├── shopkeeper.json     ❌ TODO - Shopkeeper pages
│   └── forms.json          ❌ TODO - Common form elements
├── hi/ (same structure)
├── ta/ (same structure) 
├── dz/ (same structure)
├── ne/ (same structure)
├── bn/ (same structure)
└── si/ (same structure)
```

## 🎯 Priority Implementation Order

### Phase 1: Authentication (HIGH PRIORITY)
- **Files**: `auth.json`, `forms.json`
- **Pages**: Login, Signup, Authentication
- **Why First**: Public-facing pages that all users see

### Phase 2: User Interfaces (MEDIUM PRIORITY)  
- **Files**: `user.json`, `dealer.json`, `delivery.json`
- **Pages**: User dashboards, Dealer pages, Delivery pages
- **Why Second**: Core user functionality

### Phase 3: Admin Interfaces (LOW PRIORITY)
- **Files**: `admin.json`, `shopkeeper.json`
- **Pages**: Admin dashboard, Shopkeeper pages
- **Why Last**: Internal admin tools

## 📝 Translation File Templates

### 1. auth.json Template
```json
{
  "login": {
    "title": "Sign in",
    "description": "Access your account",
    "welcome_back": "Welcome back!",
    "email_phone": "Email or Phone",
    "password": "Password",
    "forgot_password": "Forgot password?",
    "sign_in_button": "Sign In",
    "connect_wallet": "Connect Wallet to Sign In",
    "sign_in_as": "Sign in as {role}",
    "roles": {
      "consumer": "Consumer",
      "dealer": "Dealer", 
      "delivery": "Delivery Partner",
      "shopkeeper": "Shopkeeper",
      "admin": "Administrator"
    },
    "errors": {
      "invalid_credentials": "Invalid credentials",
      "wallet_not_connected": "Please connect your wallet",
      "network_error": "Network error, please try again"
    },
    "success": {
      "login": "Successfully logged in"
    }
  },
  "signup": {
    "title": "Create Account",
    "description": "Join our platform",
    "full_name": "Full Name",
    "email": "Email Address", 
    "phone": "Phone Number",
    "create_account": "Create Account",
    "already_have_account": "Already have an account?",
    "terms_privacy": "By signing up, you agree to our Terms and Privacy Policy"
  }
}
```

### 2. forms.json Template
```json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save",
    "edit": "Edit",
    "delete": "Delete",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "finish": "Finish",
    "retry": "Retry",
    "refresh": "Refresh",
    "export": "Export",
    "import": "Import"
  },
  "validation": {
    "required": "This field is required",
    "invalid_email": "Please enter a valid email",
    "invalid_phone": "Please enter a valid phone number",
    "password_too_short": "Password must be at least 8 characters",
    "passwords_no_match": "Passwords do not match",
    "invalid_format": "Invalid format"
  },
  "placeholders": {
    "enter_email": "Enter your email",
    "enter_phone": "Enter your phone number", 
    "enter_password": "Enter your password",
    "search": "Search...",
    "select_option": "Select an option",
    "enter_amount": "Enter amount",
    "enter_address": "Enter address"
  },
  "labels": {
    "name": "Name",
    "email": "Email",
    "phone": "Phone",
    "address": "Address",
    "city": "City",
    "state": "State",
    "country": "Country",
    "pincode": "PIN Code",
    "date": "Date",
    "time": "Time",
    "amount": "Amount",
    "status": "Status",
    "type": "Type"
  }
}
```

### 3. user.json Template
```json
{
  "dashboard": {
    "title": "My Dashboard",
    "welcome": "Welcome back, {name}",
    "overview": "Overview",
    "my_orders": "My Orders",
    "transaction_history": "Transaction History", 
    "profile": "Profile",
    "wallet": "Wallet",
    "settings": "Settings"
  },
  "orders": {
    "title": "My Orders",
    "order_id": "Order ID",
    "status": "Status",
    "date": "Date",
    "amount": "Amount",
    "delivery_address": "Delivery Address",
    "statuses": {
      "pending": "Pending",
      "confirmed": "Confirmed",
      "in_transit": "In Transit",
      "delivered": "Delivered",
      "cancelled": "Cancelled"
    }
  },
  "transactions": {
    "title": "Transaction History",
    "transaction_id": "Transaction ID",
    "type": "Type",
    "amount": "Amount",
    "date": "Date",
    "status": "Status"
  },
  "profile": {
    "title": "My Profile",
    "personal_info": "Personal Information",
    "contact_details": "Contact Details",
    "save_changes": "Save Changes",
    "update_password": "Update Password",
    "account_settings": "Account Settings"
  }
}
```

## 🛠️ Implementation Steps

### Step 1: Create Translation Files
1. Copy the templates above
2. Translate all text to target language using native scripts
3. Save as `locales/{lang_code}/filename.json`
4. Ensure valid JSON syntax

### Step 2: Update i18n Configuration
Update `src/lib/i18n.js` to import new files:

```javascript
// Add imports for each new translation file
import authEn from '../../locales/en/auth.json';
import authHi from '../../locales/hi/auth.json';
import authTa from '../../locales/ta/auth.json';
import authDz from '../../locales/dz/auth.json';
import authNe from '../../locales/ne/auth.json';
import authBn from '../../locales/bn/auth.json';
import authSi from '../../locales/si/auth.json';

// Update translations object
const translations = {
  en: { 
    common: commonEn,
    auth: authEn,
    forms: formsEn,
    user: userEn,
    // ... add more
  },
  hi: { 
    common: commonHi,
    auth: authHi,
    forms: formsHi,
    user: userHi,
    // ... add more
  },
  // ... repeat for all languages
};
```

### Step 3: Update Page Components
Replace hardcoded text with translation calls:

```jsx
// Before
<h1>Sign in</h1>
<button>Submit</button>

// After  
import { useTranslation } from '@/lib/i18n';

export default function LoginPage() {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t('auth.login.title')}</h1>
      <button>{t('forms.buttons.submit')}</button>
    </>
  );
}
```

## 📋 Naming Conventions

### Key Naming Rules
- Use **snake_case** for all keys
- Use **descriptive names** with context
- **Group related items** under objects
- **Match English structure** exactly in all languages

### Examples
```json
{
  "section_name": {
    "subsection": {
      "specific_item": "Translation text",
      "action_button": "Button text",
      "error_message": "Error description"
    }
  }
}
```

## ⚠️ Important Rules

### ❌ Don't Do This
```json
{
  "stats": {
    "transparency": {
      "value": "99.9%",
      "label": "Distribution Transparency"
    }
  }
}
```

### ✅ Do This Instead
```json
{
  "stats": {
    "transparency": "Distribution Transparency",
    "transparency_value": "99.9%"
  }
}
```

### Why?
React cannot render objects as children. Always use simple strings.

## 🔍 Quality Checklist

Before submitting any translation file:

- [ ] **Valid JSON**: Use JSON validator to check syntax
- [ ] **Key Structure**: Matches English file structure exactly  
- [ ] **Simple Strings**: No objects with `value`/`label` properties
- [ ] **Native Scripts**: Use appropriate writing system for language
- [ ] **Cultural Appropriateness**: Translations make sense in context
- [ ] **Consistent Naming**: Follows snake_case convention
- [ ] **Complete Coverage**: No missing translations
- [ ] **Special Characters**: Properly escaped in JSON

## 🧪 Testing

### Test Each Language
1. Switch language in dropdown
2. Navigate to translated pages
3. Verify all text displays correctly
4. Check for missing translations
5. Test form interactions

### Browser Testing
Test in multiple browsers:
- Chrome
- Firefox  
- Safari
- Edge

## 📞 Support

### Questions or Issues?
- Check existing translation files for examples
- Refer to this guide for standards
- Test changes locally before submitting

### File Locations
- **Translation Files**: `locales/{lang}/`
- **Main Config**: `src/lib/i18n.js`
- **Language Switcher**: `src/components/LanguageSwitcher.jsx`
- **Example Usage**: `src/app/page.js`

---

**Remember**: Quality multilingual support enhances user experience and helps achieve government contract requirements. Take time to ensure translations are accurate and culturally appropriate! 🌟
