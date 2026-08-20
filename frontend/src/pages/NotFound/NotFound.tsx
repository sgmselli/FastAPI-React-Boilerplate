import React from 'react'
import { ContentNotFound } from '../../components/ContentNotFound';
import usePageTitle from '../../hooks/usePageTitle';

export const NotFound: React.FC = () => {

    usePageTitle("Not found");

    return <ContentNotFound />
}
