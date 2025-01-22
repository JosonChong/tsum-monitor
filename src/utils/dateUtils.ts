export function getDifferenceInMinutes(date1: Date, date2: Date): number {
    const diffInMilliseconds = date2.getTime() - date1.getTime();
    const diffInMinutes = diffInMilliseconds / (1000 * 60);
    
    return diffInMinutes;
}

export function timePastInMinutes(date: Date) {
    return getDifferenceInMinutes(date, new Date());
}