import React from 'react';
import { LogPerformanceTest } from '../../components/logs/test-performance';

/**
 * LogPerformance - Development page for testing log output performance
 */
export default function LogPerformance() {
    return (
        <div className="flex flex-col" style={{ height: '100%' }}>
            <div className="p-4 border-b border-default">
                <h1 className="text-2xl font-bold">Log Output Performance Test</h1>
                <p className="text-secondary">
                    Test Phase 2 LogOutput component rendering performance
                </p>
            </div>
            <div className="flex-1" style={{ minHeight: 0 }}>
                <LogPerformanceTest />
            </div>
        </div>
    );
}
