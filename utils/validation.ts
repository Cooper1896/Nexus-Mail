export const isValidEmail = (email: string): boolean => {
    // Basic validation: must contain '@' and have some characters before and after
    // This is a loose check as requested ("must contain @")
    return email.includes('@') && email.split('@')[0].length > 0 && email.split('@')[1].length > 0;
};
