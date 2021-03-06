import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productOnCart = cart.find((product) => product.id === productId);

      if (productOnCart) {
        //Product already on cart, should be incremented
        updateProductAmount({
          productId,
          amount: productOnCart.amount + 1,
        });
      } else {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );
        if (product) {
          //New Product to cart, should be added
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );
          setCart([...cart, { ...product, amount: 1 }]);
        }
      }
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex < 0) throw new Error();

      cart.splice(productIndex, 1);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
      setCart([...cart]);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        throw new Error('Erro na alteração de quantidade do produto');

      const { data: productOnStock } = await api
        .get<Stock>(`stock/${productId}`)
        .catch(() => {
          throw new Error('Erro na alteração de quantidade do produto');
        });

      if (amount > productOnStock.amount)
        throw new Error('Quantidade solicitada fora de estoque');

      const productOnCart = cart.find((product) => product.id === productId);

      if (!productOnCart)
        throw new Error('Erro na alteração de quantidade do produto');

      productOnCart.amount = amount;
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
      setCart([...cart]);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}