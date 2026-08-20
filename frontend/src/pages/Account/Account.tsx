import React from 'react'
import { useAuth } from '../../contexts/auth';
import { Loading } from '../../components/Loading';
import { Navigate } from 'react-router-dom';

const Account: React.FC = () => {

    const { user, loadingUser } = useAuth();
    
    if (loadingUser) {
        return (
            <div>
                <Loading />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <div
            className='flex flex-col mt-10 md:mt-15'
        >
            <div
                className='flex flex-col gap-3'
            >
                <h1 className='text-2xl md:text-3xl font-semibold text-color'>Welcome, {user.name}</h1>
            </div>
        </div>
    )
}

export default Account;