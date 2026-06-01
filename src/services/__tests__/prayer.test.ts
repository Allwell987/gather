import { generatePrayer } from '../prayer';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('generatePrayer', () => {
  const invokeMock = supabase.functions.invoke as jest.Mock;

  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('calls the generate-prayer function with a JSON string body and Content-Type header', async () => {
    invokeMock.mockResolvedValue({
      data: { prayer: 'Thank you for your peace.' },
      error: null,
    });

    const result = await generatePrayer('  I am anxious about my exams.  ');

    expect(result).toBe('Thank you for your peace.');
    expect(invokeMock).toHaveBeenCalledWith('generate-prayer', {
      body: JSON.stringify({ input: 'I am anxious about my exams.' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws when input is blank', async () => {
    await expect(generatePrayer('   ')).rejects.toThrow('Input is required.');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('throws when the function returns an error payload', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'Something went wrong' }, error: null });

    await expect(generatePrayer('Help me pray.')).rejects.toThrow('Something went wrong');
  });

  it('throws when the function invocation returns an error object', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'Function failed' } });

    await expect(generatePrayer('Help me pray.')).rejects.toThrow('Function failed');
  });
});
