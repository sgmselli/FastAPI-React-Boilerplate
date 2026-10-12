import { ProfileSettings } from "./ProfileSettings";
import { PasswordSettings } from "./PasswordSettings";
import usePageTitle from "../../hooks/usePageTitle";

export const Settings: React.FC = () => {

    usePageTitle("Settings");

    return (
        <section className="flex flex-col mt-10 md:mt-15 mb-16">
            <div className="w-full max-w-2xl flex flex-col gap-10">
                <h1 className="text-2xl md:text-3xl font-semibold text-color">Settings</h1>

                <ProfileSettings />
                <PasswordSettings />
            </div>
        </section>
    );
};
