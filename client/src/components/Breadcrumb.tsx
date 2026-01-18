import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <nav className="flex items-center space-x-2 text-sm mb-6">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <span className="text-slate-400">/</span>}
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-slate-600 font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
