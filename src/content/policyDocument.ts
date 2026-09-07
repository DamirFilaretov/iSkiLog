export type PolicySection = {
  title: string
  body: string
}

export const POLICY_TITLE = "iSkiLog Terms of Service and Privacy Policy"
export const POLICY_EFFECTIVE_DATE = "09.04.2026"

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
      "You retain ownership of your training data and notes. You grant iSkiLog a limited license to store and process your data for operating the service. Groups is an optional feature. If you use it, the group names, group descriptions and profile display name you provide are user-generated content. Group names and descriptions are visible to anyone signed in to iSkiLog through the group directory; your profile display name and set counts are visible to members of the groups you join. You agree not to create names or descriptions, or use a display name, that are hateful, harassing, sexually explicit, or otherwise objectionable, and not to harass other members. Names and descriptions are filtered against a blocklist before they appear. Members can report a group or another member's name, and block another member, from within the app. We review reports and remove violating content, names and groups, and may suspend accounts that repeatedly violate these terms. Report abuse to iskilog@gmail.com."
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
    title: "1. Information We Collect",
    body:
      "We collect information necessary to provide and operate iSkiLog, including your email address, authentication information, training logs, profile information, group information, and associated timestamps. We do not collect precise GPS location, biometric information, or payment information."
  },
  {
    title: "2. Data Storage and Service Providers",
    body:
      "Your data is stored using Supabase, which provides database and authentication infrastructure for iSkiLog. Authentication credentials are managed through Supabase, and data transmitted between the app and its backend services is protected using HTTPS. We may use service providers to operate, maintain, secure, or improve iSkiLog. These providers may process information on our behalf only as necessary to provide their services."
  },
  {
    title: "3. How We Use Your Information",
    body:
      "We use your information to operate iSkiLog, authenticate your account, store and display your training records, generate summaries and reports, provide group functionality, maintain security, and support the operation of the service. Your training data is private by default. Information is made visible to other users only through features that involve sharing, such as Groups, as described in Section 10."
  },
  {
    title: "4. Disclosure of Information",
    body:
      "We do not sell your personal information. We may disclose information to service providers that process data on our behalf, when necessary to operate iSkiLog, or when required by law or a valid legal process. Information you choose to make visible through Groups is shared with other iSkiLog users as described in Section 10. Such visibility is controlled by your participation in the relevant feature."
  },
  {
    title: "5. Data Retention",
    body:
      "We retain your information for as long as your account remains active or as reasonably necessary to provide iSkiLog. If you request deletion of your account, your account and associated data will be deleted in accordance with our account deletion process. Certain information may be retained temporarily where necessary for backups, security, fraud prevention, legal obligations, or dispute resolution."
  },
  {
    title: "6. Security",
    body:
      "We use reasonable technical and organizational safeguards designed to protect your information, including encrypted data transmission, authentication controls, database access restrictions, and row-level access controls. However, no method of electronic transmission or storage can be guaranteed to be completely secure."
  },
  {
    title: "7. Your Rights and Choices",
    body:
      "You may request access to, correction of, or deletion of your personal information, subject to applicable law. For privacy-related requests, contact iskilog@gmail.com. You may also stop sharing information with a Group by leaving that Group."
  },
  {
    title: "8. Children's Privacy",
    body:
      "iSkiLog is not intended for children under 13, and we do not knowingly collect personal information from children under 13."
  },
  {
    title: "9. Changes to This Privacy Policy",
    body:
      "We may update this Privacy Policy from time to time. When material changes are made, we will provide notice as appropriate and update the effective date of this Privacy Policy. Your continued use of iSkiLog after an updated Privacy Policy becomes effective constitutes acceptance of the updated policy where permitted by applicable law."
  },
  {
    title: "10. Groups",
    body:
      "Participation in Groups is optional. When you join a Group, other members can see your display name and the number of sets you logged in the last 7 or 30 days, broken down by event type. These totals may include sets logged before you joined the Group. Members cannot see individual set details, dates, scores, technique information, or personal notes. Leaving a Group stops this sharing. Group names and descriptions are visible to signed-in iSkiLog users. Private Groups require a 6-digit access code to join but otherwise share the same information among members as public Groups. Group names, descriptions, and display names are user-generated content and may be reported, moderated, or removed under the iSkiLog Terms of Service."
  }
]
