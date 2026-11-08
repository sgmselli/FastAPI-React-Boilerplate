import React from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, TestTube, Rocket, Activity, Server, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
    title: string;
    description: string;
    icon: LucideIcon;
    position: string;
}

const leftFeatures: Feature[] = [
    {
        title: 'Authentication',
        description: 'Email and Google OAuth sign in, with verification codes and password resets',
        icon: KeyRound,
        position: 'top-10 -left-4 rotate-2',
    },
    {
        title: 'Email delivery',
        description: 'Transactional emails sent in the background',
        icon: Mail,
        position: 'top-[250px] left-12 -rotate-4',
    },
    {
        title: 'Automated testing',
        description: 'Unit, integration and end-to-end tests on every push',
        icon: TestTube,
        position: 'top-[460px] -left-6 rotate-6',
    },
]

const rightFeatures: Feature[] = [
    {
        title: 'Zero-downtime deploys',
        description: 'CI/CD pipelines roll out releases without dropping a request',
        icon: Rocket,
        position: 'top-14 right-10 rotate-6',
    },
    {
        title: 'Monitoring',
        description: 'Page visits, error tracking, structured logs, uptime checks and alerts',
        icon: Activity,
        position: 'top-[270px] -right-6 rotate-5',
    },
    {
        title: 'Infrastructure as code',
        description: 'Servers provisioned from a single command with Terraform and Ansible',
        icon: Server,
        position: 'top-[480px] right-8 -rotate-3',
    },
]

// Each column fades in from the bottom card up, left column first
const revealOrder = [...[...leftFeatures].reverse(), ...[...rightFeatures].reverse()]

const FeatureCard: React.FC<{ feature: Feature; className?: string; style?: React.CSSProperties }> = ({ feature, className = '', style }) => {
    const { title, description, icon: Icon } = feature;
    return (
        <div style={style} className={`w-48 flex flex-col items-center text-center gap-2 p-5 rounded-2xl surface-color-bg shadow-[0_4px_24px_rgba(0,0,0,0.08)] ${className}`}>
            <div className="h-11 w-11 flex items-center justify-center rounded-full fastapi-color-bg text-white">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-semibold text-color">{title}</p>
                <p className="mt-1 text-sm text-gray-700 leading-snug">{description}</p>
            </div>
        </div>
    )
}

const Landing: React.FC = () => {

  return (
      <div className="relative w-full overflow-hidden">
          <div className="hidden xl:block">
              {revealOrder.map((feature, idx) => (
                  <FeatureCard
                      key={feature.title}
                      feature={feature}
                      className={`absolute motion-safe:animate-fade-in ${feature.position}`}
                      style={{ animationDelay: `${idx * 150}ms` }}
                  />
              ))}
          </div>

          <div className="relative flex flex-col items-center text-center px-4 pt-20 pb-24 xl:min-h-[700px] xl:justify-center xl:pt-0 xl:pb-0">
              <div className="mb-8 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex gap-1 fastapi-color">
                      {Array.from({ length: 5 }, (_, idx) => (
                          <Star key={idx} className="h-4 w-4 fill-current" />
                      ))}
                  </div>
                  <p className="text-sm text-gray-400 italic">
                      - "The BEST engineered template for <span className="underline">FastAPI</span> and <span className="underline">React</span>"
                  </p>
              </div>
              <h1 className="text-5xl sm:text-6xl xl:text-8xl font-extrabold tracking-tight leading-[1.05] text-color">
                  Ship your next<br />big idea
              </h1>
              <p className="mt-6 max-w-xl text-lg sm:text-xl text-gray-700 leading-relaxed">
                  Authentication, email, file storage and deployment, already built.
                  FastAPI and React, ready for production.
              </p>
              <Link
                  to="/register"
                  className="mt-10 px-10 py-5 rounded-full text-xl font-bold text-white fastapi-color-bg hover:opacity-90 transition-opacity"
              >
                  Start Building
              </Link>
          </div>
      </div>
  )
}

export default Landing;
