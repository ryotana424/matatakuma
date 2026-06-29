Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  root "tasks#index"
  get "about" => "pages#about", as: :about
  resources :tasks, only: [:index, :create, :update] do
    member do
      get :measure
    end
    resources :sessions, only: [:create, :update]
  end
  resources :reports, only: [:index, :show, :update], param: :date, constraints: { date: /\d{4}-\d{2}-\d{2}/ }
end
