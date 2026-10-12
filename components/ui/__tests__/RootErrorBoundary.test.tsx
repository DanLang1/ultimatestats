import { render, screen, userEvent } from '@testing-library/react-native';

import { RootErrorBoundary } from '@/components/ui/RootErrorBoundary';

it('renders without root providers and retries the root layout', async () => {
  const retry = jest.fn().mockResolvedValue(undefined);
  await render(<RootErrorBoundary error={new Error('root failed')} retry={retry} />);
  expect(screen.getByText('Something went wrong')).toBeVisible();
  await userEvent.setup().press(screen.getByText('Try Again'));
  expect(retry).toHaveBeenCalledTimes(1);
});
