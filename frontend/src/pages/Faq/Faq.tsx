import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import usePageTitle from "../../hooks/usePageTitle"

const GITHUB_URL = "https://github.com/sgmselli/FastAPI-React-Boilerplate"

const faqs = [
    {
        question: "What is FastAPI + React Boilerplate?",
        answer: "A production-ready starting point for full stack web apps. It pairs a FastAPI backend with a React and TypeScript frontend, and comes with authentication, email, file storage, testing and deployment already built in.",
    },
    {
        question: "Who is it for?",
        answer: "Anyone starting a new web app who doesn't want to rebuild the same foundations again. Indie hackers, startups, agencies and teams prototyping internal tools can all skip straight to the features that make their product unique.",
    },
    {
        question: "What's included out of the box?",
        answer: "Email and password sign up with verification codes, Google sign in, password resets, profile pictures stored in S3-compatible storage, transactional email via Brevo and Celery, Google Analytics, legal pages, a 404 page, automated tests and a full deployment pipeline.",
    },
    {
        question: "How do I run it locally?",
        answer: "Create your backend .env file from the example, then start everything with Docker Compose. The reverse proxy, frontend, backend, worker, database and Redis all come up together, and the app is served at http://localhost.",
    },
    {
        question: "How does authentication work?",
        answer: "Sessions use JWT access and refresh tokens stored in httpOnly cookies, so they're never exposed to JavaScript. Access tokens refresh automatically, passwords are hashed with Argon2, and routes can be restricted to signed in or signed out users.",
    },
    {
        question: "How is it deployed?",
        answer: "The frontend is hosted on Netlify. The backend, database, worker and Redis run in Docker on a DigitalOcean droplet, provisioned with Terraform and Ansible. GitHub Actions runs the tests, builds the images and rolls out new versions with zero downtime.",
    },
    {
        question: "Can I use a different storage or email provider?",
        answer: "Yes. File storage works with any S3-compatible service, including DigitalOcean Spaces, AWS S3 and MinIO. Email is sent through Brevo by default, and the sending logic lives behind a single service so it's straightforward to swap.",
    },
    {
        question: "Is it tested?",
        answer: "Every feature is covered by unit and integration tests on both the backend and frontend, plus Playwright end-to-end tests that run the real app. All of them run automatically in CI on every push.",
    },
    {
        question: "Where can I learn more?",
        answer: "The documentation folder in the repository covers the tech stack, local setup, testing, migrations, each feature and every step of deployment.",
    },
]

export const Faq: React.FC = () => {

    usePageTitle("FAQ");

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="flex flex-col items-center text-color mt-16 mb-24">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center">
                Frequently Asked Questions
            </h1>
            <p className="mt-6 text-lg text-center text-gray-700">
                If you can't find the answer you're looking for, take a look at the docs.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link to="/about-us" className="px-5 py-2 rounded-full border-2 border-gray-900 font-semibold hover:bg-gray-100 transition-colors">
                    About us
                </Link>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="px-5 py-2 rounded-full border-2 border-gray-900 font-semibold hover:bg-gray-100 transition-colors">
                    View on GitHub
                </a>
                <a href={`${GITHUB_URL}/tree/main/documentation`} target="_blank" rel="noopener noreferrer" className="px-5 py-2 rounded-full border-2 border-gray-900 font-semibold hover:bg-gray-100 transition-colors">
                    Read the docs
                </a>
            </div>

            <div className="mt-16 w-full max-w-3xl flex flex-col gap-4">
                {faqs.map(({ question, answer }, idx) => {
                    const isOpen = openIndex === idx;
                    return (
                        <div key={question} className="rounded-2xl bg-gray-100">
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : idx)}
                                aria-expanded={isOpen}
                                className="w-full flex items-center justify-between gap-4 px-6 md:px-8 py-6 text-left text-lg md:text-xl font-semibold cursor-pointer"
                            >
                                {question}
                                <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isOpen && (
                                <p className="px-6 md:px-8 pb-6 -mt-1 text-lg leading-relaxed text-gray-700">
                                    {answer}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}
