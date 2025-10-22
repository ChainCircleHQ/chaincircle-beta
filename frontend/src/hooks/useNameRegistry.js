import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCircleContract } from './useCircleContract';

// Hook to get display name for an address
export function useDisplayName(address) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['displayName', address],
    queryFn: async () => {
      const contract = await getContract('nameRegistry');
      const name = await contract.getName(address);
      // If no name is registered, return null
      return name || null;
    },
    enabled: isConnected && !!address,
    staleTime: 300000, // 5 minutes (names don't change often)
  });
}

// Hook to get current user's display name
export function useMyDisplayName() {
  const { getContract, userAddress, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['myDisplayName', userAddress],
    queryFn: async () => {
      const contract = await getContract('nameRegistry');
      const name = await contract.getName(userAddress);
      return name || null;
    },
    enabled: isConnected && !!userAddress,
    staleTime: 300000,
  });
}

// Hook to check if a name is available
export function useIsNameAvailable(name) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['nameAvailable', name],
    queryFn: async () => {
      if (!name || name.length < 3) return false;
      const contract = await getContract('nameRegistry');
      const owner = await contract.getOwner(name);
      // Name is available if owner is zero address
      return owner === '0x0000000000000000000000000000000000000000';
    },
    enabled: isConnected && !!name && name.length >= 3,
    staleTime: 10000, // 10 seconds
  });
}

// Hook to register a display name
export function useRegisterName() {
  const queryClient = useQueryClient();
  const { getContract, userAddress } = useCircleContract();

  return useMutation({
    mutationFn: async (name) => {
      const contract = await getContract('nameRegistry');
      const tx = await contract.registerName(name);
      await tx.wait();
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDisplayName', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['displayName', userAddress] });
    },
  });
}

// Hook to update display name
export function useUpdateName() {
  const queryClient = useQueryClient();
  const { getContract, userAddress } = useCircleContract();

  return useMutation({
    mutationFn: async (newName) => {
      const contract = await getContract('nameRegistry');
      const tx = await contract.updateName(newName);
      await tx.wait();
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDisplayName', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['displayName', userAddress] });
    },
  });
}

// Hook to resolve address from name
export function useResolveAddress(name) {
  const { getContract, isConnected } = useCircleContract();

  return useQuery({
    queryKey: ['resolveAddress', name],
    queryFn: async () => {
      const contract = await getContract('nameRegistry');
      const address = await contract.getOwner(name);
      if (address === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      return address;
    },
    enabled: isConnected && !!name,
    staleTime: 300000,
  });
}

// Utility component to display name or address
export function formatAddressOrName(address, name) {
  if (name && name.length > 0) {
    return name;
  }
  // Format address: 0x1234...5678
  if (address && address.length > 10) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  return address;
}
