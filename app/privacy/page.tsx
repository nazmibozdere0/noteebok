import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — noteebok',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-zinc-400 px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <div className="mb-10">
          <Link
            href="/"
            className="text-[22px] font-bold text-white tracking-tight select-none leading-none"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            noteebok
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-zinc-600 mb-10">Last updated: May 18, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">1. Overview</h2>
            <p>noteebok (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is a personal productivity tool. We respect your privacy and are committed to being transparent about the data we collect and how we use it.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">2. Information We Collect</h2>
            <p>When you sign in with Google, we receive the following from your Google account:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your profile photo</li>
            </ul>
            <p className="mt-3">This information is used solely to identify your account within noteebok.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">3. How Your Information Is Used</h2>
            <p>We use your information only to provide the noteebok service. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">4. How Your Information Is Stored</h2>
            <p>Your account data is stored securely using Supabase, a third-party backend-as-a-service provider. Your task data and notes are stored in your Supabase-backed database.</p>
            <p className="mt-3">If you use the AI features of noteebok, your Google Gemini API key is stored only in your browser&apos;s localStorage. It is never sent to our servers.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">5. Your Rights</h2>
            <p>You have the right to request deletion of your personal data at any time. To do so, contact us at{' '}
              <a href="mailto:nazmibozdere0@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                nazmibozdere0@gmail.com
              </a>. We will process deletion requests within 7 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">6. Third-Party Services</h2>
            <p>noteebok relies on the following third-party services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Google OAuth — for authentication</li>
              <li>Supabase — for data storage</li>
              <li>Google Gemini — for AI features (optional)</li>
            </ul>
            <p className="mt-3">Each of these services has its own privacy policy and terms of use.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-zinc-200 mb-2">7. Contact</h2>
            <p>If you have any questions about this privacy policy, please contact us at{' '}
              <a href="mailto:nazmibozdere0@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                nazmibozdere0@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
