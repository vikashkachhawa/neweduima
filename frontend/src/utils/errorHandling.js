export const getErrorMessage = (error, fallback = 'Something went wrong') => {
    const responseData = error?.response?.data;

    if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
        return responseData.errors[0]?.msg || fallback;
    }

    if (typeof responseData?.message === 'string' && responseData.message.trim()) {
        return responseData.message;
    }

    if (typeof responseData?.error === 'string' && responseData.error.trim()) {
        return responseData.error;
    }

    if (error?.code === 'ERR_NETWORK') {
        return 'Unable to reach the server. Check that backend is running and try again.';
    }

    if (error?.code === 'ECONNABORTED') {
        return 'The request timed out. Please try again.';
    }

    if (!error?.response && error?.request) {
        return 'No response from server. Please try again in a moment.';
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
        return error.message;
    }

    return fallback;
};