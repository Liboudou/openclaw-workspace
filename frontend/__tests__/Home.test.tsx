import { render, screen } from '@testing-library/react';
import HomePage from '../pages';
import fetch from 'jest-fetch-mock';

jest.mock('cross-fetch', () => fetch);

fetch.mockResponseOnce(
  JSON.stringify({
    cards: [
      { id: '1', name: 'Test Card', description: 'Test Description' }
    ]
  })
);

describe('HomePage', () => {
  it('renders header and card elements', async () => {
    render(<HomePage />);
    const header = await screen.findByText('Mini Next Express App');
    expect(header).toBeInTheDocument();
    const card = await screen.findByText('Test Card');
    expect(card).toBeInTheDocument();
  });
});