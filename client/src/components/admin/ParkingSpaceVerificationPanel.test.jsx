import { fireEvent, render, screen } from '@testing-library/react';
import api from '../../api/client';
import ParkingSpaceVerificationPanel from './ParkingSpaceVerificationPanel';

jest.mock('../../api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

const listing = {
  _id: 'space-1',
  title: 'Covered parking bay',
  address: '10 Example Road, Pune',
  propertyType: 'private_driveway',
  verification: { status: 'pending' },
  submittedAt: '2026-10-19T09:00:00.000Z',
  host: { name: 'A Host', email: 'host@example.test', kycStatus: 'approved' },
  location: { coordinates: [73.85, 18.52] },
  pricePerHour: 50,
  pricingByVehicle: { bike: 0, car: 50, suv: 0 },
  capacity: 2,
  capacityByVehicle: { bike: 0, car: 2, suv: 0 },
  description: 'Covered parking with a lit entrance and direct road access.',
  physicalDetails: { lengthMeters: 5, widthMeters: 2.5, entranceWidthMeters: 3 },
  authorizationEvidenceDescription: 'Permission from society management.',
  verificationChecks: { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' },
  evidenceFiles: [
    { _id: 'photo-1', purpose: 'space_photo', originalName: 'entrance.jpg', downloadUrl: '/api/admin/files/photo-1' },
    { _id: 'document-1', purpose: 'property_authorization', originalName: 'permission.pdf', downloadUrl: '/api/admin/files/document-1' },
  ],
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: { data: [listing] } });
  api.put.mockResolvedValue({ data: { message: 'saved' } });
});

test('admin can open a listing and inspect authorization evidence', async () => {
  render(<ParkingSpaceVerificationPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /Covered parking bay/ }));
  expect(await screen.findByText(/Permission from society management/)).toBeInTheDocument();
  expect(screen.getByText('permission.pdf')).toBeInTheDocument();
  expect(screen.getByText('entrance.jpg')).toBeInTheDocument();
  expect(screen.getByText('Host KYC:')).toBeInTheDocument();
});

test('admin cannot reject or request changes without a reason', async () => {
  render(<ParkingSpaceVerificationPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /Covered parking bay/ }));
  fireEvent.change(await screen.findByLabelText('Review decision'), { target: { value: 'rejected' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject listing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Add a reason/);
  expect(api.put).not.toHaveBeenCalled();
});

test('admin must complete the property, location, and physical-space checks before approval', async () => {
  render(<ParkingSpaceVerificationPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /Covered parking bay/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve and publish listing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Approve all three review checks/);
  expect(api.put).not.toHaveBeenCalled();
});
