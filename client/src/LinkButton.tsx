import React from "react";

export function LinkButton({children, onClick, isDisabled}: {children: React.ReactNode, onClick?: () => void, isDisabled?: boolean}) {
    return <button className={isDisabled ? 'strawberryLinkButtonDisabled' : 'strawberryLinkButton'} onClick={isDisabled ? undefined : onClick} disabled={!!isDisabled}>
        {children}
    </button>
}