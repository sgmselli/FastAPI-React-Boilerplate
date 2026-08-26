import React from 'react'
import { UserPlus, Rocket, KeyRound, Mail, TestTube, Scale, BookOpen, FileQuestion } from 'lucide-react'

const sections = [
    {
        title: 'Authentication',
        description: 'Login and registration with secure, session-based authentication and authentication-required pages.',
        icon: UserPlus,
    },
    {
        title: 'Password Recovery',
        description: 'Securely reset a forgotten password via an emailed reset link.',
        icon: KeyRound,
    },
    {
        title: 'Email Delivery',
        description: 'Send emails asyncronously using a third-party smtp service.',
        icon: Mail,
    },
    {
        title: '404 Not Found Handling',
        description: 'A polished not-found page catches any unmatched route.',
        icon: FileQuestion,
    },
    {
        title: 'Legal Pages',
        description: 'Ready-made privacy policy and terms and conditions pages.',
        icon: Scale,
    },
    {
        title: 'Built-in Deployment',
        description: 'Dockerized application with Terraform-built infrastructure and CI/CD automation.',
        icon: Rocket,
    },
    {
        title: 'Automated Testing',
        description: 'Test suites for both the frontend and backend, run automatically in CI.',
        icon: TestTube,
    },
    {
        title: 'Documentation',
        description: 'Pre-built documentation covering application structure, deployment, testing, features, and more at an enterprise system level.',
        icon: BookOpen,
    },
]

const Landing: React.FC = () => {

  return (
      <div className="mt-10 mb-10 flex flex-col items-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Full stack FastAPI and React application
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl">
              A boilerplate built using FastAPI and React including the following pre-built featues:
          </p>

          <div className="mt-14 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {sections.map(({ title, description, icon: Icon }) => (
                  <div
                      key={title}
                      className="flex flex-col h-full p-6 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                      <Icon className="h-6 w-6 text-blue-700" />
                      <h2 className="mt-4 text-lg font-bold text-gray-900">{title}</h2>
                      <p className="mt-2 text-gray-500">{description}</p>
                  </div>
              ))}
          </div>
      </div>
  )
}

export default Landing;