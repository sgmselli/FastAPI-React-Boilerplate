import usePageTitle from "../../hooks/usePageTitle"

export const TermsAndConditions: React.FC = () => {

    usePageTitle("Terms and conditions");

    return (
        <div className="flex flex-col items-center text-color mt-16 mb-24">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center">Terms & Conditions</h1>
            <p className="mt-8 max-w-2xl text-lg md:text-xl font-semibold text-center leading-relaxed text-gray-800">
                Welcome to <span className="underline">FastAPI + React Boilerplate</span>. 
                These Terms & Conditions (“Terms”) govern your use of our website and services. 
                By accessing or using the site, you agree to be bound by these Terms. If you do not agree, please stop using the website immediately.
            </p>

            <div className="w-full max-w-2xl flex flex-col text-lg leading-relaxed text-gray-800">
                {/* 1. Use of the Website */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Use of the Website</h3>
                    <p>
                        You may browse and download guitar tabs and music sheets for personal, non-commercial use only.
                        You agree not to use the website for any unlawful purpose, to violate copyright laws, or to misuse the content provided.
                    </p>
                </div>

                {/* 2. Account Registration */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration</h3>

                    <p>
                        To download tabs or access certain features, you may need to create an account. When creating an account, you agree that:
                    </p>

                    <ul className="list-disc list-inside space-y-2 mt-3 mb-5">
                        <li>You will provide accurate and up-to-date information</li>
                        <li>You will keep your account secure</li>
                        <li>You are responsible for all activity under your account</li>
                    </ul>

                    <p>
                        If you register using Google Sign-In, you authorize us to receive your Google account email, name, and Google ID solely for authentication purposes.
                    </p>

                    <p className="mt-5">
                        Passwords are stored securely using industry-standard hashing. We never store plain-text passwords.
                    </p>
                </div>

                {/* 3. Intellectual Property */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Intellectual Property</h3>
                    <p>
                        All content on <span className="underline">FastAPI + React Boilerplate</span> — including images, text, PDF files, guitar tabs, and other materials — is protected by copyright.
                    </p>

                    <p className="mt-5">
                        You may not copy, reproduce, distribute, upload, or publicly share any content without permission from the respective rights holders.
                    </p>

                    <p className="mt-5">
                        You are responsible for ensuring that any downloaded material is used legally and in compliance with applicable copyright laws.
                    </p>
                </div>

                {/* 4. User Responsibilities */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. User Responsibilities</h3>
                    <p>By using the site, you agree NOT to:</p>

                    <ul className="list-disc list-inside space-y-2 mt-3 mb-5">
                        <li>Use the site for illegal or unauthorized purposes</li>
                        <li>Attempt to scrape, copy, or download large portions of the website</li>
                        <li>Share, resell, or redistribute downloaded tabs or sheet music</li>
                        <li>Interfere with the website’s functionality, security, or servers</li>
                        <li>Attempt to bypass download limitations or security measures</li>
                    </ul>

                    <p>
                        Violating these rules may result in account suspension or termination.
                    </p>
                </div>

                {/* 5. Downloads */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Downloads</h3>
                    <p>
                        PDF files and sheet music provided on the website are for personal use only. We do not guarantee their accuracy, completeness, or legal status.
                    </p>
                    <p className="mt-5">
                        You may not redistribute downloaded files or make them publicly available.
                    </p>
                </div>

                {/* 6. Third-Party Links */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Third-Party Links</h3>
                    <p>
                        The website may contain links to third-party sites. We are not responsible for the content, actions, or policies of external websites. 
                        Visiting these sites is at your own risk.
                    </p>
                </div>

                {/* 7. Disclaimer of Warranties */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimer of Warranties</h3>
                    <p>
                        The site and its content are provided “as-is” without warranties of any kind, whether express or implied. 
                        We do not guarantee uninterrupted access, accuracy of content, or error-free performance.
                    </p>
                </div>

                {/* 8. Limitation of Liability */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h3>
                    <p>
                        To the fullest extent allowed by law, we are not liable for any damages arising from your use of the website, 
                        including but not limited to:
                    </p>

                    <ul className="list-disc list-inside space-y-2 mt-3 mb-5">
                        <li>Loss of data</li>
                        <li>Device issues or damage</li>
                        <li>Misuse of downloaded content</li>
                        <li>Inaccuracies or errors in provided files</li>
                    </ul>
                </div>

                {/* 9. Changes to the Website or Terms */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to the Website or Terms</h3>
                    <p>
                        We may update, modify, or remove website content at any time. We may also update these Terms.
                    </p>
                    <p className="mt-5">
                        Your continued use of the site means you accept the updated Terms.
                    </p>
                </div>

                {/* 10. Governing Law */}
                <div className="flex flex-col mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">10. Governing Law</h3>
                    <p>
                        These Terms are governed by the laws of your local jurisdiction, without regard to conflict-of-law principles.
                    </p>
                </div>
            </div>
        </div>
    )
}