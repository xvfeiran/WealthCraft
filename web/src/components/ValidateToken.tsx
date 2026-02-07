import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * 组件：在应用启动时验证token有效性
 * 如果token无效（用户不存在或token过期），自动清理并跳转到登录页
 */
export function ValidateToken({ children }: { children: React.ReactNode }) {
  const { validateToken } = useAuth();
  const navigate = useNavigate();
  const hasValidated = useRef(false);

  useEffect(() => {
    // 只验证一次，避免重复API调用
    if (hasValidated.current) {
      return;
    }

    const token = localStorage.getItem('token');

    if (token) {
      hasValidated.current = true;

      validateToken().then((isValid) => {
        if (!isValid) {
          // Token无效，应该已经被清理，并触发重定向
          navigate('/login');
        }
      }).catch(() => {
        // 验证过程出错，清理token并跳转
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      });
    } else {
      hasValidated.current = true;
    }
  }, []);

  return <>{children}</>;
}
