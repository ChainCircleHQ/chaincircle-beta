const formatDate = (dateInput) => {
  // Handle Unix timestamp (seconds or milliseconds)
  let date;
  if (typeof dateInput === 'number') {
    // If it's a Unix timestamp in seconds (< year 3000 in milliseconds)
    date = dateInput < 10000000000 ? new Date(dateInput * 1000) : new Date(dateInput);
  } else {
    date = new Date(dateInput);
  }

  // Calculate relative time for recent dates
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  // Handle future dates (upcoming payouts)
  if (diffMs < 0) {
    const futureDiffSec = Math.abs(diffSec);
    const futureDiffMin = Math.abs(diffMin);
    const futureDiffHour = Math.abs(diffHour);
    const futureDiffDays = Math.abs(diffDays);

    if (futureDiffSec < 60) return `in ${futureDiffSec} seconds`;
    if (futureDiffMin < 60) return `in ${futureDiffMin} minute${futureDiffMin > 1 ? 's' : ''}`;
    if (futureDiffHour < 24) return `in ${futureDiffHour} hour${futureDiffHour > 1 ? 's' : ''}`;
    if (futureDiffDays < 7) return `in ${futureDiffDays} day${futureDiffDays > 1 ? 's' : ''}`;
    // For future dates > 7 days away, return formatted date (fall through to end)
  } else {
    // Return relative time for recent events (past)
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // For older dates, return formatted date
  const dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  return date.toLocaleDateString(undefined, dateOptions);
};

export { formatDate };