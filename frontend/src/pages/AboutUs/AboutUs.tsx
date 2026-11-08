import usePageTitle from "../../hooks/usePageTitle"

export const AboutUs: React.FC = () => {

    usePageTitle("About us");

    return (
        <div className="flex flex-col items-center text-color mt-16 mb-24">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center">
                Our Story
            </h1>
            <p className="mt-8 max-w-2xl text-lg md:text-xl font-semibold text-center leading-relaxed text-gray-800">
                We believe the best ideas shouldn't wait on boilerplate. Our goal is to let you go from
                idea to production on day one, not month one.
            </p>

            <div className="mt-14 max-w-2xl flex flex-col gap-8 text-lg leading-relaxed text-gray-800">
                <p className="first-letter:float-left first-letter:text-7xl first-letter:font-bold first-letter:leading-[0.85] first-letter:mr-3 first-letter:text-gray-900">
                    When we started building FastAPI + React Boilerplate, the goal was simple: stop rebuilding
                    the same foundations every time a new project began. Every app needs sign up, log in,
                    password resets, emails, file uploads and a way to get to production. None of that is what
                    makes a product special, yet it routinely eats the first few weeks of every build.
                </p>

                <p>
                    Where did the idea come from? Project after project, we found ourselves copying auth flows
                    from one repo to the next, rewiring Celery workers, re-learning Terraform and patching
                    together CI pipelines. Each copy drifted a little further from the last, and each one had
                    its own subtle bugs. It was time to build it properly, once.
                </p>

                <p>
                    So we built a foundation we'd trust in production. A FastAPI backend with async SQLAlchemy,
                    Alembic migrations and Celery background jobs. A React and TypeScript frontend with
                    secure, cookie-based sessions. Email verification, Google sign in, S3-compatible file
                    storage and analytics, all wired up and ready to use.
                </p>

                <p>
                    But working code isn't enough on its own. A boilerplate is only useful if you can trust it,
                    understand it and ship it. That's why every feature comes with unit, integration and
                    end-to-end tests, why the infrastructure is defined in Terraform and Ansible, why deployments
                    roll out with zero downtime, and why every part of the system is documented.
                </p>

                <p>
                    Today, the boilerplate is a starting point for anyone who wants to spend their time on the
                    parts of their product that matter. Clone it, make it yours, and start building the thing
                    you actually set out to build.
                </p>
            </div>
        </div>
    )
}
