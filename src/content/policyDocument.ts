export type PolicySection = {
  title: string
  body: string
}

export const POLICY_TITLE = "iSkiLog Terms of Service and Privacy Policy"
export const POLICY_EFFECTIVE_DATE = "02.23.2026"

export const TERMS_OF_SERVICE: PolicySection[] = [
  {
    title: "1. Acceptance of Terms",
    body:
      "By creating an account or using iSkiLog, you agree to these Terms of Service and the Privacy Policy. If you do not agree, do not use the application. You must be at least 13 years old to use the app."
  },
  {
    title: "2. Description of Service",
    body:
      "iSkiLog allows users to create accounts, log water ski sets, organize sets into seasons, and view reports. The app does not provide coaching, medical advice, or professional instruction."
  },
  {
    title: "3. Account Responsibilities",
    body:
      "You agree to provide accurate information, keep login credentials secure, not share your account, and notify us of unauthorized access."
  },
  {
    title: "4. User Content",
    body:
      "You retain ownership of your training data and notes. You grant iSkiLog a limited license to store and process your data for operating the service."
  },
  {
    title: "5. Data Accuracy and Loss",
    body:
      "The service is provided as is. iSkiLog does not guarantee uninterrupted service or protection from data loss."
  },
  {
    title: "6. Prohibited Use",
    body:
      "You may not attempt to access other users' data, exploit the system, upload malicious content, or use the app unlawfully."
  },
  {
    title: "7. Intellectual Property",
    body:
      "All branding, design, and code are property of the developer. Unauthorized copying or distribution is prohibited."
  },
  {
    title: "8. Limitation of Liability",
    body:
      "iSkiLog is a logging tool only. The developer is not liable for injuries, training outcomes, or losses resulting from use of the app."
  },
  {
    title: "9. Termination",
    body:
      "You may stop using the service at any time. Accounts violating these terms may be suspended or terminated."
  },
  {
    title: "10. Changes to Terms",
    body:
      "Terms may be updated periodically. Continued use constitutes acceptance of revised terms."
  }
]

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: "1. Information Collected",
    body:
      "We collect email addresses, authentication data handled by Supabase, training logs, and timestamps. We do not collect GPS, biometric data, or payment information in V1."
  },
  {
    title: "2. Data Storage",
    body:
      "Data is stored securely in Supabase using PostgreSQL. Authentication is managed by Supabase. All communication uses HTTPS."
  },
  {
    title: "3. How Data Is Used",
    body:
      "Data is used to display logs, generate summaries, and provide trend reports. There are no social features."
  },
  {
    title: "4. Data Sharing",
    body:
      "We do not sell or share your data with third parties except if required by law."
  },
  {
    title: "5. Data Retention",
    body:
      "Data remains while your account is active. Deleted accounts may result in permanent data removal."
  },
  {
    title: "6. Security",
    body:
      "Security measures include encrypted transport, authentication controls, and database restrictions."
  },
  {
    title: "7. Your Rights",
    body:
      "You may request access, correction, or deletion of your data. Contact: [Insert contact email]."
  },
  {
    title: "8. Children's Privacy",
    body:
      "The app is not intended for children under 13."
  },
  {
    title: "9. Changes to Privacy Policy",
    body:
      "This policy may be updated periodically. Continued use indicates acceptance."
  }
]
