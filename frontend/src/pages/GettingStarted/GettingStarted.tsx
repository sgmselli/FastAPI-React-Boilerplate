import { useAuth } from "../../contexts/auth"
import usePageTitle from "../../hooks/usePageTitle"

export const GettingStarted: React.FC = () => {

    usePageTitle("Getting started");

    const { user } = useAuth();

    return (
        <div className="flex flex-col text-color">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Getting started</h1>

            <p className="mt-10 text-xl font-semibold">
                Hey {user?.display_name}, welcome to FastAPI + React Boilerplate 👋
            </p>
            <p className="mt-4 text-lg text-gray-700 leading-relaxed">
                Here's a quick overview of the boilerplate. Follow along to get your app up and running.
            </p>
        </div>
    )
}
