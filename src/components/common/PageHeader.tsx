import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, children }: PageHeaderProps) {
    // Update browser tab title
    useEffect(() => {
        document.title = `${title} — SmartSchool ERP`;
        return () => { document.title = 'SmartSchool ERP'; };
    }, [title]);

    return (
        <div className="animate-fade-up">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Link to="/" className="hover:text-foreground transition-colors">
                        <Home className="w-3.5 h-3.5" />
                    </Link>
                    {breadcrumbs.map((item, index) => (
                        <span key={index} className="flex items-center gap-1">
                            <ChevronRight className="w-3.5 h-3.5" />
                            {item.href ? (
                                <Link to={item.href} className="hover:text-foreground transition-colors">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-foreground font-medium">{item.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
                    {description && <p className="text-muted-foreground mt-1">{description}</p>}
                </div>
                {children && <div className="flex items-center gap-2">{children}</div>}
            </div>
        </div>
    );
}
