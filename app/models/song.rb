class Song < ActiveRecord::Base
  has_many :pins
  has_many :users, through: :pins

end
