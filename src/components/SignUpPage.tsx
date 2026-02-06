import { useEffect } from 'react';
import { SignUp } from '@clerk/clerk-react';

const SignUpPage = () => {
  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                        linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  // Add placeholder text to username field after Clerk component mounts
  useEffect(() => {
    const addPlaceholder = () => {
      // Try multiple selectors to find the username input field
      const selectors = [
        'input[name="username"]',
        'input[id*="username"]',
        'input[type="text"][autocomplete="username"]',
        'input[data-testid*="username"]',
        'input[aria-label*="username" i]',
        'input[aria-label*="Username" i]',
        // Clerk-specific selectors
        'input[type="text"]:not([name="emailAddress"]):not([name="password"]):not([name="firstName"]):not([name="lastName"])'
      ];

      for (const selector of selectors) {
        const inputs = document.querySelectorAll<HTMLInputElement>(selector);
        for (const input of inputs) {
          // Check if this is likely the username field (not email, password, etc.)
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
          
          if (
            (name.includes('username') || id.includes('username') || ariaLabel.includes('username')) &&
            input.type === 'text' &&
            !input.placeholder
          ) {
            input.placeholder = 'Choose a username (e.g., johndoe)';
            return; // Found and set, exit early
          }
        }
      }

      // Fallback: find the first text input that doesn't have a placeholder and isn't email/password
      const allTextInputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
      for (const input of allTextInputs) {
        const name = input.name?.toLowerCase() || '';
        if (
          !name.includes('email') &&
          !name.includes('password') &&
          !name.includes('first') &&
          !name.includes('last') &&
          !input.placeholder &&
          !input.value
        ) {
          input.placeholder = 'Choose a username (e.g., johndoe)';
          return;
        }
      }
    };

    // Try immediately
    addPlaceholder();

    // Try multiple times with increasing delays to catch Clerk's async rendering
    const timers = [
      setTimeout(addPlaceholder, 100),
      setTimeout(addPlaceholder, 300),
      setTimeout(addPlaceholder, 500),
      setTimeout(addPlaceholder, 1000),
      setTimeout(addPlaceholder, 2000)
    ];

    // Set up a MutationObserver to catch when Clerk adds the input
    const observer = new MutationObserver(() => {
      addPlaceholder();
    });
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'name', 'id']
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: lightGradient }}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-2" style={{ color: '#6366f1' }}>⚡</h1>
          <h2 className="text-4xl font-bold mb-2" style={{ color: '#4f46e5' }}>Join Lightning</h2>
          <p className="text-lg" style={{ color: '#6b7280' }}>Start sharing your testimony today</p>
        </div>

        <div className="rounded-2xl shadow-2xl p-8 border border-white/25" style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
        }}>
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-500 hover:bg-blue-600 text-slate-100',
                card: 'shadow-none',
                headerTitle: 'text-2xl font-bold text-slate-800',
                headerSubtitle: 'text-slate-600',
                socialButtonsBlockButton: 'border-slate-300 hover:bg-slate-50',
                formFieldLabel: 'text-slate-700 font-semibold',
                formFieldInput: 'border-slate-300 focus:border-blue-500',
                footerActionLink: 'text-blue-500 hover:text-blue-600',
                formFieldInput__username: 'placeholder:text-slate-400',
                formFieldInput__emailAddress: 'placeholder:text-slate-400',
                formFieldInput__password: 'placeholder:text-slate-400'
              }
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>

        <p className="text-sm mt-6" style={{ color: '#6b7280' }}>
          Free account • Share your story • Connect with believers worldwide
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
